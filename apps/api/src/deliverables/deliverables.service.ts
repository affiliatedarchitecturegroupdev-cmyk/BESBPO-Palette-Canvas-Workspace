import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface DeliverableRow {
  id: string;
  project_id: string;
  workstream_id: string | null;
  name: string;
  deliverable_type: string;
  status: string;
  due_date: string | null;
  assignee_id: string | null;
}

@Injectable()
export class DeliverablesService {
  constructor(private readonly db: Database) {}

  async list(orgId: string, projectId: string): Promise<DeliverableRow[]> {
    const { rows } = await this.db.query<DeliverableRow>(
      `SELECT id, project_id, workstream_id, name, deliverable_type, status, due_date, assignee_id
       FROM deliverable WHERE org_id = $1 AND project_id = $2 ORDER BY created_at`,
      [orgId, projectId],
    );
    return rows;
  }

  async create(
    orgId: string,
    projectId: string,
    input: { name: string; deliverableType?: string; workstreamId?: string; dueDate?: string; assigneeId?: string },
  ): Promise<DeliverableRow> {
    return this.db.one<DeliverableRow>(
      `INSERT INTO deliverable (id, org_id, project_id, workstream_id, name, deliverable_type, due_date, assignee_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, project_id, workstream_id, name, deliverable_type, status, due_date, assignee_id`,
      [
        randomUUID(),
        orgId,
        projectId,
        input.workstreamId ?? null,
        input.name,
        input.deliverableType ?? 'generic',
        input.dueDate ?? null,
        input.assigneeId ?? null,
      ] as never[],
    );
  }

  async setStatus(orgId: string, id: string, status: string): Promise<DeliverableRow> {
    const row = await this.db.oneOrNull<DeliverableRow>(
      `UPDATE deliverable SET status = $3, updated_at = now()
       WHERE org_id = $1 AND id = $2
       RETURNING id, project_id, workstream_id, name, deliverable_type, status, due_date, assignee_id`,
      [orgId, id, status],
    );
    if (!row) throw new NotFoundException('deliverable not found');
    return row;
  }

  /** Tasks linked to one deliverable (for critical path display). */
  async tasksFor(orgId: string, id: string): Promise<Array<{ id: string; title: string; status: string }>> {
    const { rows } = await this.db.query<{ id: string; title: string; status: string }>(
      'SELECT id, title, status FROM task WHERE org_id = $1 AND deliverable_id = $2',
      [orgId, id],
    );
    return rows;
  }
}
