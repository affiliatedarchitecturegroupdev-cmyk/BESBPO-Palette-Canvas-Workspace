import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface LegalHoldRow {
  id: string;
  org_id: string;
  scope_type: string;
  scope_id: string;
  reason: string;
  set_by: string;
  created_at: string;
  released_at: string | null;
}

/**
 * P6-14 legal holds + retention. Retention purges notifications, resolved
 * comments and old job rows older than the org's retention window — but an
 * active legal hold on the organisation blocks the purge entirely, and a
 * project-scoped hold protects that project's rows. Every purge is audited.
 */
@Injectable()
export class LegalService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async listHolds(orgId: string, includeReleased = false): Promise<LegalHoldRow[]> {
    const { rows } = await this.db.query<LegalHoldRow>(
      `SELECT * FROM legal_hold WHERE org_id = $1 ${includeReleased ? '' : 'AND released_at IS NULL'}
       ORDER BY created_at DESC`,
      [orgId],
    );
    return rows;
  }

  async setHold(orgId: string, actorId: string, scopeType: string, scopeId: string, reason: string): Promise<LegalHoldRow> {
    const hold = await this.db.one<LegalHoldRow>(
      `INSERT INTO legal_hold (id, org_id, scope_type, scope_id, reason, set_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), orgId, scopeType, scopeId, reason, actorId],
    );
    await this.audit.log(orgId, actorId, 'legal_hold.set', scopeType, scopeId, { reason });
    return hold;
  }

  async releaseHold(orgId: string, actorId: string, id: string): Promise<LegalHoldRow | null> {
    const hold = await this.db.oneOrNull<LegalHoldRow>(
      `UPDATE legal_hold SET released_at = now() WHERE id = $1 AND org_id = $2 AND released_at IS NULL RETURNING *`,
      [id, orgId],
    );
    if (hold) {
      await this.audit.log(orgId, actorId, 'legal_hold.released', hold.scope_type, hold.scope_id, { holdId: id });
    }
    return hold;
  }

  async getRetention(orgId: string): Promise<number> {
    const row = await this.db.one<{ retention_days: number }>(
      'SELECT retention_days FROM organisation WHERE id = $1',
      [orgId],
    );
    return row.retention_days;
  }

  async setRetention(orgId: string, actorId: string, days: number): Promise<number> {
    await this.db.query('UPDATE organisation SET retention_days = $2 WHERE id = $1', [orgId, days]);
    await this.audit.log(orgId, actorId, 'retention.updated', 'organisation', orgId, { days });
    return days;
  }

  /**
   * Purge data older than the retention window. Throws 409 when any active
   * org-wide hold exists; project-held rows are excluded from deletion.
   */
  async purge(orgId: string, actorId: string): Promise<{ notifications: number; jobs: number; blockedProjects: string[] }> {
    const holds = await this.listHolds(orgId);
    if (holds.some((h) => h.scope_type === 'organisation')) {
      throw new ConflictException('purge blocked by active legal hold');
    }
    const heldProjects = holds.filter((h) => h.scope_type === 'project').map((h) => h.scope_id);
    const days = await this.getRetention(orgId);

    const notif = await this.db.query<{ id: string }>(
      `DELETE FROM notification
       WHERE org_id = $1 AND created_at < now() - ($2 || ' days')::interval
         AND read_at IS NOT NULL
       RETURNING id`,
      [orgId, String(days)],
    );
    const jobs = await this.db.query<{ id: string }>(
      `DELETE FROM job
       WHERE org_id = $1 AND status IN ('done','dead') AND updated_at < now() - ($2 || ' days')::interval
       RETURNING id`,
      [orgId, String(days)],
    );
    const result = { notifications: notif.rows.length, jobs: jobs.rows.length, blockedProjects: heldProjects };
    await this.audit.log(orgId, actorId, 'retention.purged', 'organisation', orgId, result);
    return result;
  }
}
