import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface AuditRow {
  id: string;
  org_id: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  at: string;
}

/**
 * Postgres-backed audit trail (append-only). High-risk actions — role grants,
 * template changes, status transitions, conversions — must log here per the
 * planning document's auditability baseline.
 */
@Injectable()
export class AuditService {
  constructor(private readonly db: Database) {}

  async log(
    orgId: string,
    actor: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<AuditRow> {
    return this.db.one<AuditRow>(
      `INSERT INTO audit_event (id, org_id, actor, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [randomUUID(), orgId, actor, action, targetType, targetId, JSON.stringify(metadata)],
    );
  }

  async findAll(orgId: string): Promise<AuditRow[]> {
    const { rows } = await this.db.query<AuditRow>(
      'SELECT * FROM audit_event WHERE org_id = $1 ORDER BY at DESC LIMIT 500',
      [orgId],
    );
    return rows;
  }
}
