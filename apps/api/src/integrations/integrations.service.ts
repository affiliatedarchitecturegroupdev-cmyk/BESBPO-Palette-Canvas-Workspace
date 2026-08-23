import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface IntegrationRow {
  id: string;
  name: string;
  target_url: string;
  event: string;
  active: boolean;
  created_at: string;
}

/**
 * P6-04 integrations hub: outbound webhook subscriptions. Delivery is
 * best-effort (fire-and-forget with HMAC-SHA256 signature); a durable worker
 * queue with retries + DLQ is P6-11.
 */
@Injectable()
export class IntegrationsService {
  constructor(private readonly db: Database) {}

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

  /** Emit an event to all active subscriptions; returns delivery attempts. */
  async emit(orgId: string, event: string, payload: Record<string, unknown>): Promise<number> {
    const { rows } = await this.db.query<{ target_url: string; secret: string | null }>(
      'SELECT target_url, secret FROM integration WHERE org_id = $1 AND event = $2 AND active = true',
      [orgId, event],
    );
    const body = JSON.stringify({ event, payload, emitted_at: new Date().toISOString() });
    let attempted = 0;
    for (const sub of rows) {
      attempted++;
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (sub.secret) {
        headers['x-palette-signature'] = createHmac('sha256', sub.secret).update(body).digest('hex');
      }
      // fire-and-forget; failures are swallowed (queue/retries land in P6-11)
      fetch(sub.target_url, { method: 'POST', headers, body }).catch(() => undefined);
    }
    return attempted;
  }
}
