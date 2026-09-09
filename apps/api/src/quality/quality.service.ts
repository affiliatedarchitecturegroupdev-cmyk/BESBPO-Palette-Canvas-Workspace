import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { NotificationsService } from '../notifications/notifications.service';

export interface TechnicalCheckRow {
  id: string;
  version_id: string;
  name: string;
  passed: boolean;
  run_at: string;
}

export interface QaReviewerRow {
  id: string;
  version_id: string;
  reviewer_id: string;
  due_at: string | null;
  completed_at: string | null;
}

/**
 * P8-09 automated technical checks: version-scoped check runs recorded
 * here and consulted by the approval gate (a failed check blocks request).
 * P8-10 QA reviewer assignment: named reviewer + due date; completing
 * resolves the task and notifies the reviewer.
 */
@Injectable()
export class QualityService {
  constructor(
    private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  /* Technical checks */

  async technicalChecks(orgId: string, versionId: string): Promise<TechnicalCheckRow[]> {
    const { rows } = await this.db.query<TechnicalCheckRow>(
      `SELECT id, version_id, check_name AS name, passed, run_at
       FROM technical_check WHERE org_id = $1 AND version_id = $2 ORDER BY run_at`,
      [orgId, versionId],
    );
    return rows;
}

  async runTechnicalCheck(
    orgId: string,
    versionId: string,
    input: { name: string; passed: boolean },
  ): Promise<TechnicalCheckRow> {
    return this.db.one<TechnicalCheckRow>(
      `INSERT INTO technical_check (id, org_id, version_id, check_name, passed)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, version_id, check_name AS name, passed, run_at`,
      [randomUUID(), orgId, versionId, input.name, input.passed] as never[],
    );
}

  /** Any failed (unfixed) check blocks approval requests. */
  async hasFailedCheck(orgId: string, versionId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      'SELECT id FROM technical_check WHERE org_id = $1 AND version_id = $2 AND passed = false',
      [orgId, versionId],
    );
    return rows.length > 0;
}

  /* QA reviewers */

  async qaReviewers(orgId: string, versionId: string): Promise<QaReviewerRow[]> {
    const { rows } = await this.db.query<QaReviewerRow>(
      `SELECT id, version_id, reviewer_id, due_at, completed_at
       FROM qa_reviewer WHERE org_id = $1 AND version_id = $2 ORDER BY created_at`,
      [orgId, versionId],
    );
    return rows;
}


  async assignQaReviewer(
    orgId: string,
    createdBy: string,
    versionId: string,
    input: { reviewerId: string; dueAt?: string },
  ): Promise<QaReviewerRow> {
    const row = await this.db.one<QaReviewerRow>(
      `INSERT INTO qa_reviewer (id, org_id, version_id, reviewer_id, due_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, version_id, reviewer_id, due_at, completed_at`,
      [randomUUID(), orgId, versionId, input.reviewerId, input.dueAt ?? null, createdBy] as never[],
    );
    await this.notifications.emit(
      orgId,
      input.reviewerId,
      'qa_reviewer_assigned',
      'version',
      versionId,
      'You were assigned a QA review',
    );
    return row;
}


  async completeQaReview(orgId: string, id: string): Promise<QaReviewerRow> {
    const row = await this.db.oneOrNull<QaReviewerRow>(
      `UPDATE qa_reviewer SET completed_at = now() WHERE org_id = $1 AND id = $2 AND completed_at IS NULL
       RETURNING id, version_id, reviewer_id, due_at, completed_at`,
      [orgId, id],
    );
    if (!row) throw new NotFoundException('open QA review not found');
    return row;
}
}
