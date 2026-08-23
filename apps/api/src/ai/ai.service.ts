import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

export interface AiActionRow {
  id: string;
  org_id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  proposed_by: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/**
 * P6-13 AI opt-in guards. An agent may only *propose* an external change
 * (create a webhook, broadcast a notification, …); the proposal executes
 * solely after (a) the org has opted in to AI assistance and (b) a human with
 * the ai.review capability approves it. Opt-in itself is an audited,
 * ops-director-only action.
 */
@Injectable()
export class AiService {
  constructor(
    private readonly db: Database,
    private readonly integrations: IntegrationsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async optIn(orgId: string): Promise<boolean> {
    const row = await this.db.one<{ ai_opt_in: boolean }>(
      'SELECT ai_opt_in FROM organisation WHERE id = $1',
      [orgId],
    );
    return row.ai_opt_in;
  }

  async setOptIn(orgId: string, actorId: string, enabled: boolean): Promise<boolean> {
    await this.db.query('UPDATE organisation SET ai_opt_in = $2 WHERE id = $1', [orgId, enabled]);
    await this.audit.log(orgId, actorId, enabled ? 'ai.opt_in_enabled' : 'ai.opt_in_disabled', 'organisation', orgId, {});
    return enabled;
  }

  async propose(orgId: string, actorId: string, kind: string, payload: Record<string, unknown>): Promise<AiActionRow> {
    if (!(await this.optIn(orgId))) {
      throw new ForbiddenException('ai opt-in disabled for this organisation');
    }
    return this.db.one<AiActionRow>(
      `INSERT INTO ai_action (id, org_id, kind, payload, proposed_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [randomUUID(), orgId, kind, JSON.stringify(payload), actorId],
    );
  }

  async list(orgId: string, status?: string): Promise<AiActionRow[]> {
    const params: unknown[] = [orgId];
    let sql = 'SELECT * FROM ai_action WHERE org_id = $1';
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    const { rows } = await this.db.query<AiActionRow>(`${sql} ORDER BY created_at DESC LIMIT 100`, params);
    return rows;
  }

  /** Human decision; approved proposals execute immediately. */
  async decide(orgId: string, id: string, approverId: string, approve: boolean): Promise<AiActionRow> {
    const action = await this.db.oneOrNull<AiActionRow>(
      `UPDATE ai_action SET status = $3, decided_by = $4, decided_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, orgId, approve ? 'approved' : 'rejected', approverId],
    );
    if (!action) throw new NotFoundException('pending ai action not found');
    await this.audit.log(orgId, approverId, approve ? 'ai.action_approved' : 'ai.action_rejected', 'ai_action', id, { kind: action.kind });
    if (!approve) return action;

    await this.execute(action, approverId);
    return this.db.one<AiActionRow>(
      `UPDATE ai_action SET status = 'executed' WHERE id = $1 RETURNING *`,
      [id],
    );
  }

  private async execute(action: AiActionRow, approverId: string): Promise<void> {
    switch (action.kind) {
      case 'webhook.create': {
        const p = action.payload as { name: string; targetUrl: string; event: string };
        await this.integrations.create(action.org_id, approverId, p.name, p.targetUrl, p.event);
        break;
      }
      case 'notification.broadcast': {
        const p = action.payload as { message: string };
        const { rows } = await this.db.query<{ id: string }>(
          'SELECT id FROM person WHERE org_id = $1',
          [action.org_id],
        );
        for (const r of rows) {
          await this.notifications.emit(action.org_id, r.id, 'ai_broadcast', 'ai_action', action.id, p.message);
        }
        break;
      }
      default:
        throw new Error(`unsupported ai action kind ${action.kind}`);
    }
  }
}
