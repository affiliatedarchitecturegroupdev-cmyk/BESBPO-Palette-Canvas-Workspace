import { Injectable, OnModuleInit } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { Database } from '../db/database';
import { JobsService } from '../jobs/jobs.service';

export interface IntegrationRow {
  id: string;
  name: string;
  target_url: string;
  event: string;
  active: boolean;
  created_at: string;
}

/**
 * P6-04 integrations hub: outbound webhook subscriptions. Deliveries are
 * enqueued as `webhook.deliver` jobs on the P6-11 worker queue — HMAC-signed
 * POST with retries + DLQ and idempotency keys, replacing the earlier
 * fire-and-forget fetch.
 */
@Injectable()
export class IntegrationsService implements OnModuleInit {
  constructor(
    private readonly db: Database,
    private readonly jobs: JobsService,
  ) {}

  onModuleInit() {
    this.jobs.registerHandler('webhook.deliver', async (payload) => {
      const body = JSON.stringify(payload.body);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (payload.secret) {
        headers['x-palette-signature'] = createHmac('sha256', String(payload.secret)).update(body).digest('hex');
      }
      const res = await fetch(String(payload.targetUrl), { method: 'POST', headers, body });
      if (!res.ok) throw new Error(`webhook delivery failed: HTTP ${res.status}`);
    });
  }

  async list(orgId: string): Promise<IntegrationRow[]> {
    const { rows } = await this.db.query<IntegrationRow>(
      'SELECT id, name, target_url, event, active, created_at FROM integration WHERE org_id = $1 ORDER BY created_at',
      [orgId],
    );
    return rows;
  }

  async create(orgId: string, actorId: string, name: string, targetUrl: string, event: string) {
    return this.db.one(
      `INSERT INTO integration (id, org_id, name, target_url, event, active, secret, created_by)
       VALUES ($1,$2,$3,$4,$5,true,$6,$7)
       RETURNING id, name, target_url, event, active`,
      [randomUUID(), orgId, name, targetUrl, event, randomUUID(), actorId] as never[],
    );
  }

  async setActive(orgId: string, id: string, active: boolean) {
    return this.db.oneOrNull(
      'UPDATE integration SET active = $3 WHERE id = $1 AND org_id = $2 RETURNING id, name, active',
      [id, orgId, active] as never[],
    );
  }

  /** Emit an event to all active subscriptions; returns deliveries enqueued. */
  async emit(orgId: string, event: string, payload: Record<string, unknown>): Promise<number> {
    const { rows } = await this.db.query<{ id: string; target_url: string; secret: string | null }>(
      'SELECT id, target_url, secret FROM integration WHERE org_id = $1 AND event = $2 AND active = true',
      [orgId, event],
    );
    const body = { event, payload, emitted_at: new Date().toISOString() };
    let enqueued = 0;
    for (const sub of rows) {
      await this.jobs.enqueue(
        orgId,
        'webhook.deliver',
        { integrationId: sub.id, targetUrl: sub.target_url, secret: sub.secret, body },
        { idempotencyKey: `${sub.id}:${body.emitted_at}`, maxAttempts: 3 },
      );
      enqueued++;
    }
    return enqueued;
  }

  /** P7-06: per-integration delivery health aggregated from the job table. */
  async health(orgId: string) {
    const { rows } = await this.db.query(
      `SELECT i.id, i.name, i.event, i.target_url, i.active,
              COUNT(j.id)::int AS deliveries,
              COUNT(j.id) FILTER (WHERE j.status = 'done')::int AS delivered,
              COUNT(j.id) FILTER (WHERE j.status = 'dead')::int AS dead,
              MAX(j.updated_at) AS last_at,
              (SELECT j2.status FROM job j2
                WHERE j2.org_id = i.org_id AND j2.queue = 'webhook.deliver'
                  AND j2.payload->>'integrationId' = i.id
                ORDER BY j2.updated_at DESC LIMIT 1) AS last_status
       FROM integration i
       LEFT JOIN job j ON j.org_id = i.org_id AND j.queue = 'webhook.deliver'
         AND j.payload->>'integrationId' = i.id
       WHERE i.org_id = $1
       GROUP BY i.id ORDER BY i.created_at`,
      [orgId],
    );
    return rows;
  }
}
