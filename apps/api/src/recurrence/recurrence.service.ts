import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface RecurrenceRow {
  id: string;
  project_id: string;
  base_task_id: string | null;
  cadence: string;
  interval_days: number;
  active: boolean;
  last_generated_at: string | null;
  next_run_at: string;
  created_by: string;
}

/**
 * P8-03 scheduled recurrence. A tick materialises a task from the recurrence's
 * base task (or title from the cadence if none), advances next_run_at by the
 * interval, and emits a notification to the base task assignee if present.
 */
@Injectable()
export class RecurrenceService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(orgId: string, projectId: string): Promise<RecurrenceRow[]> {
    const { rows } = await this.db.query<RecurrenceRow>(
      `SELECT id, project_id, base_task_id, cadence, interval_days, active,
              last_generated_at, next_run_at, created_by
       FROM recurrence WHERE org_id = $1 AND project_id = $2 ORDER BY created_at`,
      [orgId, projectId],
    );
    return rows;

  }

  async create(
    orgId: string,
    actorId: string,
    input: { projectId: string; cadence?: string; intervalDays?: number; baseTaskId?: string },
  ): Promise<RecurrenceRow> {
    const cadence = input.cadence ?? 'weekly';
    const intervalDays = input.intervalDays ?? (cadence === 'weekly' ? 7 : cadence === 'biweekly' ? 14 : cadence === 'monthly' ? 30 : 7);
    const row = await this.db.one<RecurrenceRow>(
      `INSERT INTO recurrence (id, org_id, project_id, base_task_id, cadence, interval_days, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, project_id, base_task_id, cadence, interval_days, active,
                 last_generated_at, next_run_at, created_by`,
      [randomUUID(), orgId, input.projectId, input.baseTaskId ?? null, cadence, intervalDays, actorId] as never[],
    );
    await this.audit.log(orgId, actorId, 'recurrence.created', 'recurrence', row.id, {
      projectId: row.project_id,
      cadence: row.cadence,
      intervalDays,
    });
    return row;

  }

  /** Generate the next task in the recurrence and advance the schedule. */
  async tick(orgId: string, actorId: string, id: string): Promise<{ taskId: string; next_run_at: string }> {
    const rec = await this.db.oneOrNull<RecurrenceRow & { base_assignee: string | null }>(
      `SELECT r.*, t.assignee_id AS base_assignee
       FROM recurrence r LEFT JOIN task t ON t.id = r.base_task_id
       WHERE r.org_id = $1 AND r.id = $2 AND r.active`,
      [orgId, id],
    );
    if (!rec) throw new NotFoundException('active recurrence not found');

    let title = `Recurring ${rec.cadence} task`;
    let assignee: string | null = null;
    if (rec.base_task_id) {
      const base = await this.db.oneOrNull<{ title: string; assignee_id: string | null }>(
        'SELECT title, assignee_id FROM task WHERE id = $1',
        [rec.base_task_id],
      );
      if (base) {
        title = `${base.title} (recurring)`;
        assignee = base.assignee_id;
      }
    }
    const taskId = randomUUID();
    const project = await this.db.one<{ status: string }>(
      'SELECT status FROM project WHERE id = $1',
      [rec.project_id],
    );
    await this.db.query(
      `INSERT INTO task (id, org_id, project_id, title, status, created_by)
       VALUES ($1,$2,$3,$4,'backlog',$5)`,
      [taskId, orgId, rec.project_id, title, actorId] as never[],
    );
    if (assignee) {
      await this.db.query('UPDATE task SET assignee_id = $2 WHERE id = $1', [taskId, assignee]);
      await this.notifications.emit(orgId, assignee, 'task_assigned', 'task', taskId, `Recurring task ready: “${title}”`);
    }
    const next = new Date(Date.now() + rec.interval_days * 86_400_000).toISOString();
    await this.db.query(
      'UPDATE recurrence SET last_generated_at = now(), next_run_at = $2 WHERE org_id = $1 AND id = $3',
      [orgId, next, id],
    );
    await this.audit.log(orgId, actorId, 'recurrence.ticked', 'recurrence', id, {
      taskId,
      projectStatus: project.status,
    });
    return { taskId, next_run_at: next };
  }

  async setActive(orgId: string, actorId: string, id: string, active: boolean): Promise<RecurrenceRow> {
    const row = await this.db.oneOrNull<RecurrenceRow>(
      `UPDATE recurrence SET active = $3 WHERE org_id = $1 AND id = $2
       RETURNING id, project_id, base_task_id, cadence, interval_days, active,
                 last_generated_at, next_run_at, created_by`,
      [orgId, id, active],
    );
    if (!row) throw new NotFoundException('recurrence not found');
    await this.audit.log(orgId, actorId, `recurrence.${active ? 'activated' : 'paused'}`,'recurrence', id, {});
    return row;

  }
}