import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface JobRow {
  id: string;
  org_id: string;
  queue: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'dead';
  attempts: number;
  max_attempts: number;
  idempotency_key: string | null;
  run_at: string;
  last_error: string | null;
  created_at: string;
}

export type JobHandler = (payload: Record<string, unknown>, job: JobRow) => Promise<void>;

const BASE_BACKOFF_MS = 1000;

/**
 * P6-11 worker queue. Postgres-backed with Redis-queue semantics: atomic
 * claim via FOR UPDATE SKIP LOCKED, exponential-backoff retries, dead-letter
 * after max attempts, and idempotent enqueue via (org, queue, key). A
 * background poller runs in normal boot; tests drive `workOnce` directly for
 * determinism (set PC_QUEUE_POLL=0 to disable the poller).
 */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly handlers = new Map<string, JobHandler>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly db: Database) {}

  onModuleInit() {
    if (process.env.PC_QUEUE_POLL === '0') return;
    this.timer = setInterval(() => {
      this.workOnce().catch(() => undefined);
    }, 2000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  registerHandler(queue: string, handler: JobHandler): void {
    this.handlers.set(queue, handler);
  }

  /** Enqueue; an existing live job with the same idempotency key is returned instead. */
  async enqueue(
    orgId: string,
    queue: string,
    payload: Record<string, unknown>,
    opts: { idempotencyKey?: string; maxAttempts?: number; delayMs?: number } = {},
  ): Promise<JobRow> {
    const id = randomUUID();
    const runAt = new Date(Date.now() + (opts.delayMs ?? 0)).toISOString();
    const row = await this.db.one<JobRow>(
      `INSERT INTO job (id, org_id, queue, payload, max_attempts, idempotency_key, run_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (org_id, queue, idempotency_key) DO NOTHING
       RETURNING *`,
      [id, orgId, queue, JSON.stringify(payload), opts.maxAttempts ?? 3, opts.idempotencyKey ?? null, runAt],
    ).catch(() => null);
    if (row) return row;
    // conflict — return the existing job
    const existing = await this.db.one<JobRow>(
      'SELECT * FROM job WHERE org_id = $1 AND queue = $2 AND idempotency_key = $3',
      [orgId, queue, opts.idempotencyKey ?? null],
    );
    return existing;
  }

  /** Process every due job once across all registered queues. Returns jobs run. */
  async workOnce(): Promise<number> {
    let ran = 0;
    for (const queue of this.handlers.keys()) {
      for (;;) {
        const job = await this.claim(queue);
        if (!job) break;
        ran++;
        await this.run(job);
      }
    }
    return ran;
  }

  private async claim(queue: string): Promise<JobRow | null> {
    return this.db.oneOrNull<JobRow>(
      `UPDATE job SET status = 'running', attempts = attempts + 1, updated_at = now()
       WHERE id = (
         SELECT id FROM job
         WHERE queue = $1 AND status = 'pending' AND run_at <= now()
         ORDER BY run_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`,
      [queue],
    );
  }

  private async run(job: JobRow): Promise<void> {
    const handler = this.handlers.get(job.queue);
    if (!handler) return;
    try {
      await handler(job.payload, job);
      await this.db.query(
        `UPDATE job SET status = 'done', last_error = NULL, updated_at = now() WHERE id = $1`,
        [job.id],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = job.attempts >= job.max_attempts;
      const backoff = BASE_BACKOFF_MS * 2 ** (job.attempts - 1);
      await this.db.query(
        `UPDATE job
         SET status = $2,
             last_error = $3,
             run_at = CASE WHEN $2 = 'pending' THEN now() + ($4 || ' milliseconds')::interval ELSE run_at END,
             updated_at = now()
         WHERE id = $1`,
        [job.id, exhausted ? 'dead' : 'pending', message, String(backoff)],
      );
    }
  }

  async list(orgId: string, queue?: string, status?: string): Promise<JobRow[]> {
    const clauses = ['org_id = $1'];
    const params: unknown[] = [orgId];
    if (queue) { params.push(queue); clauses.push(`queue = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
    const { rows } = await this.db.query<JobRow>(
      `SELECT * FROM job WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
      params,
    );
    return rows;
  }

  async dlq(orgId: string): Promise<JobRow[]> {
    return this.list(orgId, undefined, 'dead');
  }

  /** Requeue a dead job for another round of attempts. */
  async retry(orgId: string, id: string): Promise<JobRow | null> {
    return this.db.oneOrNull<JobRow>(
      `UPDATE job SET status = 'pending', attempts = 0, run_at = now(), updated_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'dead'
       RETURNING *`,
      [id, orgId],
    );
  }
}
