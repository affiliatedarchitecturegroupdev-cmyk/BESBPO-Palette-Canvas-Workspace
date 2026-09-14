
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ApprovalStepRow {
  id: string;
  project_id: string;
  name: string;
  position: number;
  required_role: string;
  active: boolean;
}

@Injectable()
export class ApprovalStepsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string, projectId: string): Promise<ApprovalStepRow[]> {
    const { rows } = await this.db.query<ApprovalStepRow>(
      `SELECT id, project_id, name, position, required_role, active
       FROM approval_step WHERE org_id = $1 AND project_id = $2 ORDER BY position, active`,
      [orgId, projectId],
    );
    return rows;
  }

  async create(
    orgId: string,
    actorId: string,
    projectId: string,
    input: { name: string; position?: number; requiredRole?: string },
  ): Promise<ApprovalStepRow> {
    const position = input.position ?? (await this.nextPosition(orgId, projectId));
    const row = await this.db.one<ApprovalStepRow>(
      `INSERT INTO approval_step (id, org_id, project_id, name, position, required_role)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, project_id, name, position, required_role, active`,
      [randomUUID(), orgId, projectId, input.name, position, input.requiredRole ?? 'client_approver'] as never[],
    );
    await this.audit.log(orgId, actorId, 'approval_step.created', 'project', projectId, {
      stepId: row.id, name: row.name, position,
    });
    return row;
}

  async complete(orgId: string, actorId: string, id: string): Promise<ApprovalStepRow> {
    const row = await this.db.oneOrNull<ApprovalStepRow>(
      `UPDATE approval_step SET active = false WHERE org_id = $1 AND id = $2 AND active
       RETURNING id, project_id, name, position, required_role, active`,
      [orgId, id],
    );
    if (!row) throw new NotFoundException('active approval step not found');
    await this.audit.log(orgId, actorId, 'approval_step.completed', 'approval_step', row.id, {
      position: row.position,
    });
    return row;
}

  async progress(orgId: string, projectId: string): Promise<{ total: number; completed: number; pending: ApprovalStepRow[] }> {
    const steps = await this.list(orgId, projectId);
    const completed = steps.filter((s) => !s.active).length;
    return { total: steps.length, completed, pending: steps.filter((s) => s.active) };
  }

  private async nextPosition(orgId: string, projectId: string): Promise<number> {
    const { rows } = await this.db.query<{ max: number | null }>(
      'SELECT MAX(position) AS max FROM approval_step WHERE org_id = $1 AND project_id = $2',
      [orgId, projectId],
    );
    return (rows[0]?.max ?? 0) + 1;
}
}
