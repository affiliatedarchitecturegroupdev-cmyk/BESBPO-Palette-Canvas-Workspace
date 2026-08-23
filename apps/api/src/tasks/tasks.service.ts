import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { NotificationsService } from '../notifications/notifications.service';

export interface TaskRow {
  id: string;
  project_id: string;
  workstream_id: string | null;
  deliverable_id: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  estimate_hours: number | null;
  sla_target: string | null;
  custom_fields: Record<string, unknown>;
  position: number;
  created_by: string;
  blocked_by?: string[]; // dependency titles not yet done (computed)
}

export interface TaskCreateInput {
  projectId: string;
  title: string;
  description?: string;
  workstreamId?: string;
  deliverableId?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  estimateHours?: number;
  slaTarget?: string;
  customFields?: Record<string, unknown>;
  status?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimateHours?: number | null;
  slaTarget?: string | null;
  customFields?: Record<string, unknown>;
  position?: number;
  deliverableId?: string | null;
  workstreamId?: string | null;
}

const DONE = 'done';

@Injectable()
export class TasksService {
  constructor(
    private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async board(orgId: string, projectId: string): Promise<TaskRow[]> {
    const { rows } = await this.db.query<TaskRow>(
      `SELECT id, project_id, workstream_id, deliverable_id, title, description, status,
              priority, assignee_id, due_date, estimate_hours, sla_target, custom_fields,
              position, created_by
       FROM task WHERE org_id = $1 AND project_id = $2
       ORDER BY status, position, created_at`,
      [orgId, projectId],
    );
    return rows;
  }

  /** Calendar/list view rows, agnostic of the board's column grouping. */
  async calendar(orgId: string, projectId: string): Promise<Array<Pick<TaskRow, 'id' | 'title' | 'due_date' | 'status' | 'assignee_id' | 'priority'>>> {
    const { rows } = await this.db.query<
      Pick<TaskRow, 'id' | 'title' | 'due_date' | 'status' | 'assignee_id' | 'priority'>
    >(
      'SELECT id, title, due_date, status, assignee_id, priority FROM task WHERE org_id = $1 AND project_id = $2 AND due_date IS NOT NULL ORDER BY due_date',
      [orgId, projectId],
    );
    return rows;
  }

  private async mustGet(orgId: string, id: string): Promise<TaskRow> {
    const row = await this.db.oneOrNull<TaskRow>(
      `SELECT id, project_id, workstream_id, deliverable_id, title, description, status,
              priority, assignee_id, due_date, estimate_hours, sla_target, custom_fields,
              position, created_by
       FROM task WHERE org_id = $1 AND id = $2`,
      [orgId, id],
    );
    if (!row) throw new NotFoundException('task not found');
    return row;
  }

  async create(orgId: string, createdBy: string, input: TaskCreateInput): Promise<TaskRow> {
    const id = randomUUID();
    const row = await this.db.one<TaskRow>(
      `INSERT INTO task (id, org_id, project_id, workstream_id, deliverable_id, title,
        description, status, priority, assignee_id, due_date, estimate_hours, sla_target,
        custom_fields, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id, project_id, workstream_id, deliverable_id, title, description, status,
                 priority, assignee_id, due_date, estimate_hours, sla_target, custom_fields,
                 position, created_by`,
      [
        id,
        orgId,
        input.projectId ?? (await this.resolveProject(orgId)),
        input.workstreamId ?? null,
        input.deliverableId ?? null,
        input.title,
        input.description ?? '',
        input.status ?? 'backlog',
        input.priority ?? 'normal',
        input.assigneeId ?? null,
        input.dueDate ?? null,
        input.estimateHours ?? null,
        input.slaTarget ?? null,
        JSON.stringify(input.customFields ?? {}),
        createdBy,
      ] as never[],
    );
    if (input.assigneeId) {
      await this.notifications.emit(
        orgId,
        input.assigneeId,
        'task_assigned',
        'task',
        row.id,
        `You were assigned “${row.title}”`,
      );
    }
    return row;
  }

  private async resolveProject(orgId: string): Promise<string> {
    const row = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM project WHERE org_id = $1 ORDER BY created_at LIMIT 1',
      [orgId],
    );
    if (!row) throw new BadRequestException('no project available');
    return row.id;
  }

  /**
   * Update with dependency enforcement: a task cannot move to `done` while it
   * still has unfinished finish-to-start dependencies (planning doc:
   * dependencies visible inside the work flow, not just metadata).
   */
  async update(orgId: string, id: string, input: TaskUpdateInput): Promise<TaskRow> {
    const current = await this.mustGet(orgId, id);
    if (input.status === DONE && current.status !== DONE) {
      const blockers = await this.openDependencies(id);
      if (blockers.length) {
        throw new BadRequestException(
          `task is blocked by unfinished dependencies: ${blockers.map((b) => b.title).join(', ')}`,
        );
      }
    }
    const next: Record<string, unknown> = {
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      status: input.status ?? current.status,
      priority: input.priority ?? current.priority,
      assignee_id: input.assigneeId === undefined ? current.assignee_id : input.assigneeId,
      due_date: input.dueDate === undefined ? current.due_date : input.dueDate,
      estimate_hours: input.estimateHours === undefined ? current.estimate_hours : input.estimateHours,
      sla_target: input.slaTarget === undefined ? current.sla_target : input.slaTarget,
      custom_fields: JSON.stringify(input.customFields ?? current.custom_fields ?? {}),
      position: input.position ?? current.position,
      deliverable_id: input.deliverableId === undefined ? current.deliverable_id : input.deliverableId,
      workstream_id: input.workstreamId === undefined ? current.workstream_id : input.workstreamId,
    };
    const row = await this.db.one<TaskRow>(
      `UPDATE task SET title=$3, description=$4, status=$5, priority=$6, assignee_id=$7,
        due_date=$8, estimate_hours=$9, sla_target=$10, custom_fields=$11, position=$12,
        deliverable_id=$13, workstream_id=$14, updated_at=now()
       WHERE org_id=$1 AND id=$2
       RETURNING id, project_id, workstream_id, deliverable_id, title, description, status,
                 priority, assignee_id, due_date, estimate_hours, sla_target, custom_fields,
                 position, created_by`,
      [orgId, id, ...Object.values(next)] as never[],
    );

    if (
      input.assigneeId !== undefined &&
      input.assigneeId &&
      input.assigneeId !== current.assignee_id
    ) {
      await this.notifications.emit(
        orgId,
        input.assigneeId,
        'task_assigned',
        'task',
        id,
        `You were assigned “${row.title}”`,
      );
    }
    if (input.status && input.status !== current.status) {
      // Notify assignee + creator about movement (communication rule: visible flow).
      const targets = new Set(
        [current.assignee_id, current.created_by].filter((x): x is string => !!x),
      );
      for (const recipientId of targets) {
        await this.notifications.emit(
          orgId,
          recipientId,
          'status_changed',
          'task',
          id,
          `“${row.title}” moved ${current.status} → ${row.status}`,
        );
      }
    }
    return row;
  }

  private async openDependencies(taskId: string): Promise<Array<{ id: string; title: string }>> {
    const { rows } = await this.db.query<{ id: string; title: string }>(
      `SELECT t.id, t.title FROM task_dependency d JOIN task t ON t.id = d.depends_on
       WHERE d.task_id = $1 AND t.status <> $2`,
      [taskId, DONE],
    );
    return rows;
  }

  async addDependency(orgId: string, taskId: string, dependsOn: string): Promise<void> {
    await this.mustGet(orgId, taskId);
    await this.mustGet(orgId, dependsOn);
    await this.db.query(
      'INSERT INTO task_dependency (task_id, depends_on) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [taskId, dependsOn],
    );
  }

  async dependencies(orgId: string, taskId: string): Promise<{ blocks: string[]; blocked_by: string[] }> {
    await this.mustGet(orgId, taskId);
    const blocks = (
      await this.db.query<{ title: string }>(
        `SELECT t.title FROM task_dependency d JOIN task t ON t.id = d.depends_on AND t.org_id = $1
         WHERE d.task_id = $2`,
        [orgId, taskId],
      )
    ).rows.map((r) => r.title);
    const blockedBy = (
      await this.db.query<{ title: string }>(
        `SELECT t.title FROM task_dependency d JOIN task t ON t.id = d.task_id AND t.org_id = $1
         WHERE d.depends_on = $2`,
        [orgId, taskId],
      )
    ).rows.map((r) => r.title);
    return { blocks, blocked_by: blockedBy };
  }

  async checklist(taskId: string): Promise<
    Array<{ id: string; label: string; done: boolean; position: number }>
  > {
    const { rows } = await this.db.query<{ id: string; label: string; done: boolean; position: number }>(
      'SELECT id, label, done, position FROM task_checklist WHERE task_id = $1 ORDER BY position, label',
      [taskId],
    );
    return rows;
  }

  async addChecklistItem(taskId: string, label: string): Promise<{ id: string; label: string; done: boolean }> {
    const { rows } = await this.db.query<{ id: string; label: string; done: boolean }>(
      'INSERT INTO task_checklist (id, task_id, label) VALUES ($1,$2,$3) RETURNING id, label, done',
      [randomUUID(), taskId, label],
    );
    return rows[0];
  }

  async toggleChecklistItem(id: string): Promise<{ id: string; done: boolean }> {
    return this.db.one<{ id: string; done: boolean }>(
      'UPDATE task_checklist SET done = NOT done WHERE id = $1 RETURNING id, done',
      [id],
    );
  }

  async collaborators(taskId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ person_id: string }>(
      'SELECT person_id FROM task_collaborator WHERE task_id = $1',
      [taskId],
    );
    return rows.map((r) => r.person_id);
  }

  async addCollaborator(taskId: string, personId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO task_collaborator (task_id, person_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [taskId, personId],
    );
  }
}
