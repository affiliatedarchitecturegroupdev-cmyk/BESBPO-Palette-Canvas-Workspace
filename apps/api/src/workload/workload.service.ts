import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface WorkloadRow {
  person_id: string;
  name: string;
  open_tasks: number;
  estimated_hours: number;
  logged_hours: number;
}

/**
 * Workload basics (planning doc Phase 3): open assignments, estimated hours
 * and logged effort per person. Advanced capacity planning lands in Phase 6.
 */
@Injectable()
export class WorkloadService {
  constructor(private readonly db: Database) {}

  async byPerson(orgId: string): Promise<WorkloadRow[]> {
    const { rows } = await this.db.query<WorkloadRow>(
      `SELECT p.id AS person_id, p.name,
              COUNT(t.id) FILTER (WHERE t.status <> 'done') AS open_tasks,
              COALESCE(SUM(t.estimate_hours) FILTER (WHERE t.status <> 'done'), 0) AS estimated_hours,
              (
                SELECT COALESCE(SUM(te.hours), 0) FROM time_entry te
                WHERE te.org_id = $1 AND te.person_id = p.id
              ) AS logged_hours
       FROM person p
       LEFT JOIN task t ON t.assignee_id = p.id AND t.org_id = $1
       WHERE p.org_id = $1
       GROUP BY p.id, p.name
       ORDER BY open_tasks DESC, p.name`,
      [orgId],
    );
    return rows;
  }

  async logTime(orgId: string, personId: string, taskId: string, hours: number, note = ''): Promise<{ id: string; hours: number }> {
    const row = await this.db.one<{ id: string; hours: number }>(
      'INSERT INTO time_entry (id, org_id, task_id, person_id, hours, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, hours',
      [randomUUID(), orgId, taskId, personId, hours, note] as never[],
    );
    return row;
  }

  async timesFor(taskId: string): Promise<Array<{ id: string; person_id: string; hours: number; note: string; logged_at: string }>> {
    const { rows } = await this.db.query<{ id: string; person_id: string; hours: number; note: string; logged_at: string }>(
      'SELECT id, person_id, hours, note, logged_at FROM time_entry WHERE task_id = $1 ORDER BY logged_at DESC',
      [taskId],
    );
    return rows;
  }
}
