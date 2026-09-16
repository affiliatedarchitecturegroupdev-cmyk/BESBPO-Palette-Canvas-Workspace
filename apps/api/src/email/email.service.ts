import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { Database } from '../db/database';
import { hashToken, CREDENTIAL_TOKEN_TTL_MS } from '../auth/session';
import { EmailTransport, createEmailTransport } from './email.transport';

export interface EnqueueInput {
  orgId: string;
  recipient: string;
  subject: string;
  body: string;
  kind: string;
  /**
   * Plaintext single-use token to attach. Only its hash is stored in
   * `token_hash`, which is what a lookup compares against.
   *
   * Note the deliberate gap: while §0.2 is unanswered there is no provider, so
   * the outbox row *is* the delivery channel and `body` has to carry the
   * plaintext token for a developer or operator to read it. That makes the
   * hash-at-rest protection cosmetic in this configuration. When a provider is
   * selected, `body` should be rendered from the token at dispatch time and
   * this field should stop being persisted in the row. Tracked as an open item
   * in ADR-0002.
   */
  token?: string;
}

export interface EnqueuedEmail {
  id: string;
}

/**
 * Transactional mail (spec §0.2). Two phases, deliberately:
 *
 *  1. `enqueue` writes the `email_outbox` row inside the caller's transaction,
 *     so a credential request and its token commit together or not at all.
 *  2. `dispatch` hands the row to the configured transport and records the
 *     outcome. It runs after commit and never throws.
 *
 * Keeping these separate is what makes the missing-provider case safe: the
 * token row is durable even when there is no transport to send it, so the
 * operator can retry once §0.2 is answered instead of asking the user to
 * re-register. It also means a transport outage cannot roll back a signup.
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private readonly transport: EmailTransport;

  constructor(private readonly db: Database) {
    this.transport = createEmailTransport();
    if (!this.transport.isConfigured()) {
      this.log.warn('no email transport configured; messages are recorded but not delivered');
    }
  }

  /** Transport name, for the settings/health surface. */
  get transportName(): string {
    return this.transport.name;
  }

  isDeliverable(): boolean {
    return this.transport.isConfigured();
  }

  /**
   * Write the outbox row. Pass the signup/reset transaction's `client` so the
   * row commits atomically with the work it belongs to.
   */
  async enqueue(input: EnqueueInput, client?: PoolClient): Promise<EnqueuedEmail> {
    const id = randomUUID();
    const sql = `INSERT INTO email_outbox (id, org_id, recipient, subject, body, kind, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               CASE WHEN $7::text IS NULL THEN NULL ELSE now() + ($8 * interval '1 ms') END)`;
    const params = [
      id,
      input.orgId,
      input.recipient,
      input.subject,
      input.body,
      input.kind,
      input.token ? hashToken(input.token) : null,
      CREDENTIAL_TOKEN_TTL_MS,
    ];
    if (client) {
      await client.query(sql, params);
    } else {
      await this.db.query(sql, params);
    }
    return { id };
  }

  /**
   * Send a queued message and record the outcome. Resolves to whether delivery
   * happened; it never throws, so callers on the request path can fire and
   * forget without wrapping it.
   */
  async dispatch(outboxId: string): Promise<boolean> {
    const row = await this.db.oneOrNull<{ recipient: string; subject: string; body: string | null }>(
      'SELECT recipient, subject, body FROM email_outbox WHERE id = $1',
      [outboxId],
    );
    if (!row) return false;
    const result = await this.transport.send({
      to: row.recipient,
      subject: row.subject,
      body: row.body ?? '',
    });
    await this.db.query(
      `UPDATE email_outbox
          SET delivered_at = CASE WHEN $2 THEN now() ELSE delivered_at END,
              send_error = $3,
              transport = $4,
              send_attempts = send_attempts + 1
        WHERE id = $1`,
      [outboxId, result.delivered, result.reason ?? null, result.transport],
    );
    if (!result.delivered) {
      this.log.warn(`outbox ${outboxId} not delivered via ${result.transport}: ${result.reason}`);
    }
    return result.delivered;
  }

  /** Convenience: enqueue outside a transaction and send immediately. */
  async sendNow(input: EnqueueInput): Promise<{ id: string; delivered: boolean }> {
    const { id } = await this.enqueue(input);
    const delivered = await this.dispatch(id);
    return { id, delivered };
  }
}