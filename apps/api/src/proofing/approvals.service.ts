import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { VersionsService } from './versions.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ApprovalRow {
  id: string;
  version_id: string;
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_note: string | null;
  due_at: string | null;
  superseded_by: string | null;
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly db: Database,
    private readonly versions: VersionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(orgId: string, versionId: string): Promise<ApprovalRow[]> {
    const { rows } = await this.db.query<ApprovalRow>(
      'SELECT id, version_id, requested_by, requested_at, decided_by, decided_at, decision, decision_note, due_at, superseded_by FROM approval WHERE org_id = $1 AND version_id = $2 ORDER BY requested_at',
      [orgId, versionId],
    );
    return rows;
  }

  async get(orgId: string, id: string): Promise<ApprovalRow> {
    const row = await this.db.oneOrNull<ApprovalRow>(
      'SELECT id, version_id, requested_by, requested_at, decided_by, decided_at, decision, decision_note, due_at, superseded_by FROM approval WHERE org_id = $1 AND id = $2',
      [orgId, id],
    );
    if (!row) throw new NotFoundException('approval not found');
    return row;
  }

  /** Request client review; requires the version to have passed internal QA. */
  async request(orgId: string, requestedBy: string, versionId: string, dueAt?: string): Promise<ApprovalRow> {
    const qaOk = await this.versions.qaComplete(orgId, versionId);
    if (!qaOk) {
      throw new ConflictException('version must complete internal QA before client review');
    }
    const row = await this.db.one<ApprovalRow>(
      `INSERT INTO approval (id, org_id, version_id, requested_by, due_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, version_id, requested_by, requested_at, decided_by, decided_at, decision, decision_note, due_at, superseded_by`,
      [randomUUID(), orgId, versionId, requestedBy, dueAt ?? null],
    );
    await this.db.query("UPDATE version SET status = 'in_review' WHERE org_id = $1 AND id = $2", [orgId, versionId]);
    // notify all client approvers (join through person to avoid org-scoped role_binding key)
    const { rows: approvers } = await this.db.query<{ person_id: string }>(
      `SELECT rb.person_id FROM role_binding rb JOIN person p ON p.id = rb.person_id
       WHERE p.org_id = $1 AND rb.role = 'client_approver'`,
      [orgId],
    );
    for (const a of approvers) {
      await this.notifications.emit(orgId, a.person_id, 'approval_requested', 'version', versionId, 'A version awaits your decision');
    }
    return row;
  }

  /** Client decision. Only the approvals.decide capability may call. */
  async decide(orgId: string, decidedBy: string, id: string, decision: 'approved' | 'changes_requested', note?: string): Promise<ApprovalRow> {
    const current = await this.get(orgId, id);
    if (current.decision) {
      throw new ConflictException('approval already decided');
    }
    const row = await this.db.one<ApprovalRow>(
      `UPDATE approval SET decided_by = $3, decided_at = now(), decision = $4, decision_note = $5
       WHERE org_id = $1 AND id = $2
       RETURNING id, version_id, requested_by, requested_at, decided_by, decided_at, decision, decision_note, due_at, superseded_by`,
      [orgId, id, decidedBy, decision, note ?? null],
    );
    const status = decision === 'approved' ? 'approved' : 'changes_requested';
    await this.db.query('UPDATE version SET status = $1 WHERE org_id = $2 AND id = $3', [status, orgId, row.version_id]);
    // notify requester so they can triage change requests
    await this.notifications.emit(orgId, row.requested_by, `approval_${decision}`, 'approval', id, `Version decision: ${decision}`);
    return row;
  }

  /* Change requests — proposed after a changes_requested decision, accepted/declined by account manager. */

  async listChanges(orgId: string, projectId: string) {
    const { rows } = await this.db.query(
      'SELECT id, approval_id, project_id, title, scope_note, impact_hours, impact_cost, status, decided_by, decided_at, created_by, created_at FROM change_request WHERE org_id = $1 AND project_id = $2 ORDER BY created_at',
      [orgId, projectId],
    );
    return rows;
  }

  async proposeChange(orgId: string, createdBy: string, projectId: string, input: { title: string; scopeNote?: string; impactHours?: number; impactCost?: number; approvalId?: string }) {
    return this.db.one(
      `INSERT INTO change_request (id, org_id, project_id, approval_id, title, scope_note, impact_hours, impact_cost, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, approval_id, project_id, title, scope_note, impact_hours, impact_cost, status, decided_by, decided_at, created_by, created_at`,
      [randomUUID(), orgId, projectId, input.approvalId ?? null, input.title, input.scopeNote ?? null, input.impactHours ?? null, input.impactCost ?? null, createdBy],
    );
  }

  async decideChange(orgId: string, decidedBy: string, id: string, decision: 'accepted' | 'declined') {
    if (!['accepted', 'declined'].includes(decision)) throw new ForbiddenException('invalid change decision');
    const row = await this.db.oneOrNull(
      `UPDATE change_request SET status = $3, decided_by = $4, decided_at = now()
       WHERE org_id = $1 AND id = $2 AND status = 'proposed'
       RETURNING id, approval_id, project_id, title, scope_note, impact_hours, impact_cost, status, decided_by, decided_at, created_by, created_at`,
      [orgId, id, decision, decidedBy],
    );
    if (!row) throw new NotFoundException('change request not found or already decided');
    return row;
  }
}
