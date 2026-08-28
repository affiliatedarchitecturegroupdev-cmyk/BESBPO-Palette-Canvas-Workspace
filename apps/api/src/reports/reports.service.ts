import { Injectable } from '@nestjs/common';
import { Database } from '../db/database';

export interface UtilisationRow {
  person_id: string;
  name: string;
  logged_hours: number;
  weekly_hours: number;
  utilisation_pct: number;
}

export interface ProjectEffortRow {
  project_id: string;
  title: string;
  status: string;
  estimated_hours: number;
  logged_hours: number;
  variance_hours: number;
}

export interface PortfolioRow {
  status: string;
  projects: number;
  open_tasks: number;
  estimated_hours: number;
}

export interface SlaRow {
  project_id: string;
  title: string;
  task_id: string;
  task_title: string;
  sla_target: string;
  due_date: string | null;
  status: string;
  breached: boolean;
}

export interface AccountHealthRow {
  agency_id: string;
  agency_name: string;
  projects: number;
  tasks_total: number;
  tasks_completed: number;
  open_approvals: number;
  avg_decision_hours: number | null;
  last_activity: string | null;
}

/** P6-02 time/effort reporting + P6-03 portfolio/WIP/SLA dashboards. */
@Injectable()
export class ReportsService {
  constructor(private readonly db: Database) {}

  /** B-06 account health: engagement roll-up per agency. */
  async accountHealth(orgId: string): Promise<AccountHealthRow[]> {
    const { rows } = await this.db.query<AccountHealthRow>(
      `SELECT a.id AS agency_id, a.name AS agency_name,
              COUNT(DISTINCT p.id)::int AS projects,
              COUNT(DISTINCT t.id)::int AS tasks_total,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done')::int AS tasks_completed,
              COUNT(DISTINCT ap.id) FILTER (WHERE ap.decision IS NULL)::int AS open_approvals,
              ROUND(AVG(EXTRACT(EPOCH FROM (ap.decided_at - ap.requested_at)) / 3600)
                FILTER (WHERE ap.decided_at IS NOT NULL)::numeric, 1) AS avg_decision_hours,
              GREATEST(MAX(p.updated_at), MAX(t.updated_at), MAX(ap.decided_at)) AS last_activity
       FROM agency a
       LEFT JOIN project p ON p.agency_id = a.id
       LEFT JOIN task t ON t.project_id = p.id
       LEFT JOIN deliverable d ON d.project_id = p.id
       LEFT JOIN version v ON v.deliverable_id = d.id
       LEFT JOIN approval ap ON ap.version_id = v.id
       WHERE a.org_id = $1
       GROUP BY a.id, a.name ORDER BY a.name`,
      [orgId],
    );
    return rows;
  }

  /** P6-02: logged effort vs weekly capacity per person (utilisation). */
  async utilisation(orgId: string): Promise<UtilisationRow[]> {
    const { rows } = await this.db.query<{ person_id: string; name: string; logged_hours: string; weekly_hours: string }>(
      `SELECT p.id AS person_id, p.name,
              COALESCE((SELECT SUM(te.hours) FROM time_entry te WHERE te.org_id = $1 AND te.person_id = p.id), 0) AS logged_hours,
              COALESCE(pc.weekly_hours, 40) AS weekly_hours
       FROM person p
       LEFT JOIN person_capacity pc ON pc.person_id = p.id AND pc.org_id = $1
       WHERE p.org_id = $1
       ORDER BY logged_hours DESC, p.name`,
      [orgId],
    );
    return rows.map((r) => {
      const weekly = Number(r.weekly_hours);
      const logged = Number(r.logged_hours);
      return {
        person_id: r.person_id,
        name: r.name,
        logged_hours: logged,
        weekly_hours: weekly,
        utilisation_pct: weekly > 0 ? Math.round((logged / weekly) * 1000) / 10 : 0,
      };
    });
  }

  /** P6-02: estimated vs logged effort per project with variance. */
  async effortByProject(orgId: string): Promise<ProjectEffortRow[]> {
    const { rows } = await this.db.query<{ project_id: string; title: string; status: string; estimated_hours: string; logged_hours: string }>(
      `SELECT pr.id AS project_id, pr.name AS title, pr.status,
              COALESCE(SUM(t.estimate_hours), 0) AS estimated_hours,
              COALESCE((
                SELECT SUM(te.hours) FROM time_entry te
                JOIN task t2 ON t2.id = te.task_id
                WHERE t2.project_id = pr.id
              ), 0) AS logged_hours
       FROM project pr
       LEFT JOIN task t ON t.project_id = pr.id AND t.org_id = $1
       WHERE pr.org_id = $1
       GROUP BY pr.id, pr.name, pr.status
       ORDER BY pr.name`,
      [orgId],
    );
    return rows.map((r) => {
      const est = Number(r.estimated_hours);
      const log = Number(r.logged_hours);
      return {
        project_id: r.project_id,
        title: r.title,
        status: r.status,
        estimated_hours: est,
        logged_hours: log,
        variance_hours: Math.round((log - est) * 10) / 10,
      };
    });
  }

  /** P6-03: portfolio roll-up by project status (WIP counts + estimated load). */
  async portfolio(orgId: string): Promise<PortfolioRow[]> {
    const { rows } = await this.db.query<{ status: string; projects: string; open_tasks: string; estimated_hours: string }>(
      `SELECT pr.status,
              COUNT(DISTINCT pr.id) AS projects,
              COUNT(t.id) FILTER (WHERE t.status <> 'done') AS open_tasks,
              COALESCE(SUM(t.estimate_hours) FILTER (WHERE t.status <> 'done'), 0) AS estimated_hours
       FROM project pr
       LEFT JOIN task t ON t.project_id = pr.id AND t.org_id = $1
       WHERE pr.org_id = $1
       GROUP BY pr.status
       ORDER BY projects DESC, pr.status`,
      [orgId],
    );
    return rows.map((r) => ({
      status: r.status,
      projects: Number(r.projects),
      open_tasks: Number(r.open_tasks),
      estimated_hours: Number(r.estimated_hours),
    }));
  }

  /** P6-03: open tasks with an SLA target, flagging breaches (due date passed). */
  async sla(orgId: string): Promise<SlaRow[]> {
    const { rows } = await this.db.query<{ project_id: string; title: string; task_id: string; task_title: string; sla_target: string; due_date: string | null; status: string }>(
      `SELECT pr.id AS project_id, pr.name AS title, t.id AS task_id, t.title AS task_title,
              t.sla_target, t.due_date, t.status
       FROM task t
       JOIN project pr ON pr.id = t.project_id
       WHERE t.org_id = $1 AND t.sla_target IS NOT NULL AND t.status <> 'done'
       ORDER BY t.due_date NULLS LAST, t.title`,
      [orgId],
    );
    const today = new Date().toISOString().slice(0, 10);
    return rows.map((r) => ({
      project_id: r.project_id,
      title: r.title,
      task_id: r.task_id,
      task_title: r.task_title,
      sla_target: r.sla_target,
      due_date: r.due_date,
      status: r.status,
      breached: !!r.due_date && r.due_date < today,
    }));
  }
}
