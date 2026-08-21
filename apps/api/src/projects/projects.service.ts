import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ProjectStatus, Role, PROJECT_STATUSES } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { IntakeService, BriefRow } from '../intake/intake.service';

export interface ProjectRow {
  id: string;
  org_id: string;
  agency_id: string;
  brand_id: string;
  template_id: string;
  brief_id: string | null;
  name: string;
  status: string;
  visibility: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneRow {
  id: string;
  project_id: string;
  name: string;
  target_date: string | null;
  status: string;
}

export interface ProjectRoleRow {
  project_id: string;
  person_id: string;
  role: string;
}

export interface ProjectHome {
  project: ProjectRow;
  milestones: MilestoneRow[];
  roles: (ProjectRoleRow & { email: string; name: string })[];
  brief: BriefRow | null;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: Database,
    private readonly intake: IntakeService,
  ) {}

  async list(orgId: string, agencyFilter: string[] | null): Promise<ProjectRow[]> {
    const base = 'SELECT * FROM project WHERE org_id = $1';
    if (agencyFilter) {
      const { rows } = await this.db.query<ProjectRow>(
        `${base} AND agency_id = ANY($2) ORDER BY created_at DESC`,
        [orgId, agencyFilter],
      );
      return rows;
    }
    const { rows } = await this.db.query<ProjectRow>(`${base} ORDER BY created_at DESC`, [orgId]);
    return rows;
  }

  async home(orgId: string, id: string): Promise<ProjectHome | null> {
    const project = await this.db.oneOrNull<ProjectRow>(
      'SELECT * FROM project WHERE org_id = $1 AND id = $2',
      [orgId, id],
    );
    if (!project) return null;
    const { rows: milestones } = await this.db.query<MilestoneRow>(
      'SELECT * FROM milestone WHERE project_id = $1 ORDER BY target_date NULLS LAST, name',
      [id],
    );
    const { rows: roles } = await this.db.query<
      ProjectRoleRow & { email: string; name: string }
    >(
      `SELECT pr.*, p.email, p.name FROM project_role pr
       JOIN person p ON p.id = pr.person_id WHERE pr.project_id = $1`,
      [id],
    );
    const brief = project.brief_id
      ? await this.intake.get(orgId, project.brief_id)
      : null;
    return { project, milestones, roles, brief };
  }

  /** Convert a qualified brief into a governed project (lifecycle stage 3). */
  async convertBrief(orgId: string, briefId: string, userId: string): Promise<ProjectRow> {
    const brief = await this.intake.get(orgId, briefId);
    if (!brief) throw new BadRequestException('brief not found');
    if (brief.status !== 'qualified') {
      throw new BadRequestException('brief must be triaged as qualified before conversion');
    }
    if (!brief.template_id) {
      throw new BadRequestException('brief must reference a service template');
    }
    const { rows: existing } = await this.db.query<ProjectRow>(
      'SELECT * FROM project WHERE org_id = $1 AND brief_id = $2',
      [orgId, briefId],
    );
    if (existing.length) return existing[0];

    const { rows: templateRows } = await this.db.query<{ definition: { phases: string[] } }>(
      'SELECT definition FROM service_template WHERE id = $1',
      [brief.template_id],
    );
    const phases = templateRows[0]?.definition?.phases ?? [];
    const initial = (phases[0] as ProjectStatus | undefined) ?? ProjectStatus.Planning;

    const project = await this.db.one<ProjectRow>(
      `INSERT INTO project (id, org_id, agency_id, brand_id, template_id, brief_id, name, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        randomUUID(),
        orgId,
        brief.agency_id,
        brief.brand_id,
        brief.template_id,
        brief.id,
        brief.title,
        initial,
        userId,
      ],
    );
    await this.intake.setStatus(orgId, briefId, 'converted');
    return project;
  }

  async addMilestone(
    orgId: string,
    projectId: string,
    name: string,
    targetDate?: string,
  ): Promise<MilestoneRow> {
    await this.assertProjectInOrg(orgId, projectId);
    return this.db.one<MilestoneRow>(
      'INSERT INTO milestone (id, project_id, name, target_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), projectId, name, targetDate ?? null],
    );
  }

  async setMilestoneStatus(orgId: string, milestoneId: string, status: string): Promise<MilestoneRow> {
    return this.db.one<MilestoneRow>(
      `UPDATE milestone SET status = $3
       WHERE id = $1 AND project_id IN (SELECT id FROM project WHERE org_id = $2)
       RETURNING *`,
      [milestoneId, orgId, status],
    );
  }

  async setProjectStatus(orgId: string, projectId: string, status: ProjectStatus): Promise<ProjectRow> {
    if (!PROJECT_STATUSES.includes(status)) {
      throw new BadRequestException(`invalid status ${status}`);
    }
    return this.db.one<ProjectRow>(
      `UPDATE project SET status = $3, updated_at = now()
       WHERE org_id = $1 AND id = $2 RETURNING *`,
      [orgId, projectId, status],
    );
  }

  async assignRole(orgId: string, projectId: string, personId: string, role: Role): Promise<void> {
    await this.assertProjectInOrg(orgId, projectId);
    await this.db.query(
      `INSERT INTO project_role (project_id, person_id, role) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [projectId, personId, role],
    );
  }

  async revokeRole(orgId: string, projectId: string, personId: string, role: Role): Promise<void> {
    await this.assertProjectInOrg(orgId, projectId);
    await this.db.query(
      'DELETE FROM project_role WHERE project_id = $1 AND person_id = $2 AND role = $3',
      [projectId, personId, role],
    );
  }

  private async assertProjectInOrg(orgId: string, projectId: string): Promise<void> {
    const p = await this.db.oneOrNull('SELECT id FROM project WHERE org_id = $1 AND id = $2', [
      orgId,
      projectId,
    ]);
    if (!p) throw new BadRequestException('project not found in organisation');
  }
}
