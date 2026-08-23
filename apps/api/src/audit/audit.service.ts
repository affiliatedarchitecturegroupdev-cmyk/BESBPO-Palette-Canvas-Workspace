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

  /** B-01 audit explorer: filter by action/actor/target/date range/free text. */
  async search(orgId: string, filters: AuditFilters): Promise<AuditRow[]> {
    const clauses = ['org_id = $1'];
    const params: unknown[] = [orgId];
    if (filters.action) { params.push(filters.action); clauses.push(`action = $${params.length}`); }
    if (filters.actor) { params.push(filters.actor); clauses.push(`actor = $${params.length}`); }
    if (filters.targetType) { params.push(filters.targetType); clauses.push(`target_type = $${params.length}`); }
    if (filters.from) { params.push(filters.from); clauses.push(`at >= $${params.length}`); }
    if (filters.to) { params.push(filters.to); clauses.push(`at <= $${params.length}`); }
    if (filters.q) {
      params.push(`%${filters.q}%`);
      clauses.push(`(target_id ILIKE $${params.length} OR metadata::text ILIKE $${params.length} OR action ILIKE $${params.length})`);
    }
    const { rows } = await this.db.query<AuditRow>(
      `SELECT * FROM audit_event WHERE ${clauses.join(' AND ')} ORDER BY at DESC LIMIT 500`,
      params,
    );
    return rows;
  }
}

export interface AuditFilters {
  action?: string;
  actor?: string;
  targetType?: string;
  from?: string;
  to?: string;
  q?: string;
}
