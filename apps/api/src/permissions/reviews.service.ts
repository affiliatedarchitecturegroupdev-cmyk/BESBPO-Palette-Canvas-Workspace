import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { AuthzService } from '../identity/authz.service';

export interface PermissionReviewRow {
  id: string;
  org_id: string;
  role: string;
  capability: string;
  effect: 'grant' | 'revoke';
  status: 'pending' | 'approved' | 'rejected';
  rationale: string;
  proposed_by: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/**
 * B-02 permissions reviews: capability changes for an org go through a
 * propose → decide approval chain. An approved review writes a
 * role_capability_override row which AuthzService consults (org-scoped
 * overlay on the static role map). Proposer and decider must differ —
 * separation of duties for permission changes.
 */
@Injectable()
export class PermissionsReviewsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly authz: AuthzService,
  ) {}

  async list(orgId: string, status?: string): Promise<PermissionReviewRow[]> {
    const params: unknown[] = [orgId];
    let sql = 'SELECT * FROM permission_review WHERE org_id = $1';
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    const { rows } = await this.db.query<PermissionReviewRow>(`${sql} ORDER BY created_at DESC LIMIT 100`, params);
    return rows;
  }

  async propose(orgId: string, actorId: string, role: string, capability: string, effect: 'grant' | 'revoke', rationale: string) {
    const review = await this.db.one<PermissionReviewRow>(
      `INSERT INTO permission_review (id, org_id, role, capability, effect, rationale, proposed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), orgId, role, capability, effect, rationale, actorId],
    );
    await this.audit.log(orgId, actorId, 'permission_review.proposed', 'permission_review', review.id, { role, capability, effect });
    return review;
  }

  async decide(orgId: string, id: string, deciderId: string, approve: boolean): Promise<PermissionReviewRow> {
    const review = await this.db.oneOrNull<PermissionReviewRow>(
      `UPDATE permission_review SET status = $3, decided_by = $4, decided_at = now()
       WHERE id = $1 AND org_id = $2 AND status = 'pending' AND proposed_by <> $4
       RETURNING *`,
      [id, orgId, approve ? 'approved' : 'rejected', deciderId],
    );
    if (!review) throw new NotFoundException('pending review not found (or proposer cannot decide)');
    await this.audit.log(orgId, deciderId, approve ? 'permission_review.approved' : 'permission_review.rejected',
      'permission_review', id, { role: review.role, capability: review.capability, effect: review.effect });
    if (approve) {
      await this.db.query(
        `INSERT INTO role_capability_override (id, org_id, role, capability, effect, review_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (org_id, role, capability) DO UPDATE SET effect = EXCLUDED.effect, review_id = EXCLUDED.review_id`,
        [randomUUID(), orgId, review.role, review.capability, review.effect, review.id],
      );
      this.authz.invalidateOverrides(orgId);
    }
    return review;
  }

  async overrides(orgId: string) {
    const { rows } = await this.db.query(
      'SELECT role, capability, effect, created_at FROM role_capability_override WHERE org_id = $1 ORDER BY created_at DESC',
      [orgId],
    );
    return rows;
  }
}
