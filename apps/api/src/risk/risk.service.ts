import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface RiskRegisterRow {
  id: string;
  project_id: string;
  title: string;
   severity: string;
   status: string;
   owner_id: string | null;
   created_by: string;
   created_at: string;
}

/** P8-12 project risk register: expected-owner sign-off on open risks. */
@Injectable()
export class RiskService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string, projectId: string): Promise<RiskRegisterRow[]> {
    const { rows } = await this.db.query<RiskRegisterRow>(
      `SELECT id, project_id, title, severity, status, owner_id, created_by, created_at
       FROM risk_register WHERE org_id = $1 AND project_id = $2 ORDER BY created_at`,
      [orgId, projectId],
    );
    return rows;
  }

  async create(
    orgId: string,
    actorId: string,
    projectId: string,
    input: { title: string; severity?: 'low' | 'medium' | 'high'; ownerId?: string },
  ): Promise<RiskRegisterRow> {
    const row = await this.db.one<RiskRegisterRow>(
      `INSERT INTO risk_register (id, org_id, project_id, title, severity, status, owner_id, created_by)
       VALUES ($1,$2,$3,$4,$5,'open',$6,$7)
       RETURNING id, project_id, title, severity, status, owner_id, created_by, created_at`,
      [randomUUID(), orgId, projectId, input.title, input.severity ?? 'medium', input.ownerId ?? null, actorId] as never[],
    );
   return row;
  }

  async updateStatus(
    orgId: string,
    actorId: string,
    id: string,
    status: 'open' | 'mitigated' | 'accepted',
  ): Promise<RiskRegisterRow> {
    const row = await this.db.oneOrNull<RiskRegisterRow>(
      `UPDATE risk_register SET status = $3 WHERE org_id = $1 AND id = $2
       RETURNING id, project_id, title, severity, status, owner_id, created_by, created_at`,
      [orgId, id, status],
    );
    if (!row) throw new NotFoundException('risk not found');
   return row;
}
}
