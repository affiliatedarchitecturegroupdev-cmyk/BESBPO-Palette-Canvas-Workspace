import { Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability, ProjectStatus, Role } from '@palette-canvas/shared';
import { ProjectsService } from './projects.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsRead);
    const filter = this.authz.agencyFilter(ctx);
    const rows = await this.projects.list(ctx.orgId, filter);
    // Project-scoped users additionally see assigned projects.
    const projectScopes = ctx.scopes.map((s) => s.workspaceId);
    if (filter) {
      const visible = await this.scopedRows(ctx.orgId, projectScopes);
      return [...rows, ...visible];
    }
    return rows;
  }

  private async scopedRows(orgId: string, projectScopes: string[]) {
    if (!projectScopes.length) return [];
    return this.projects.list(orgId, null).then((all) =>
      all.filter((p) => projectScopes.includes(p.id)),
    );
  }

  @Get(':id')
  async home(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsRead);
    return this.projects.home(ctx.orgId, id);
  }

  @Post('convert')
  async convert(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { briefId: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntakeConvert);
    const project = await this.projects.convertBrief(ctx.orgId, body.briefId, ctx.userId);
    await this.audit.log(ctx.orgId, ctx.userId, 'brief.converted_to_project', 'project', project.id, {
      briefId: body.briefId,
      templateId: project.template_id,
    });
    return project;
  }

  @Post(':id/milestones')
  async addMilestone(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { name: string; targetDate?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsManage);
    const ms = await this.projects.addMilestone(ctx.orgId, id, body.name, body.targetDate);
    await this.audit.log(ctx.orgId, ctx.userId, 'milestone.created', 'milestone', ms.id, {
      projectId: id,
      name: body.name,
    });
    return ms;
  }

  @Post(':id/status')
  async setStatus(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: ProjectStatus },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsManage);
    const p = await this.projects.setProjectStatus(ctx.orgId, id, body.status);
    await this.audit.log(ctx.orgId, ctx.userId, 'project.status_changed', 'project', id, {
      to: body.status,
    });
    return p;
  }

  @Post(':id/roles')
  async assignRole(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { personId: string; role: Role },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsManage);
    await this.projects.assignRole(ctx.orgId, id, body.personId, body.role);
    await this.audit.log(ctx.orgId, ctx.userId, 'project.role_assigned', 'project', id, {
      personId: body.personId,
      role: body.role,
    });
    return { ok: true };
  }

  @Delete(':id/roles')
  async revokeRole(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { personId: string; role: Role },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsManage);
    await this.projects.revokeRole(ctx.orgId, id, body.personId, body.role);
    await this.audit.log(ctx.orgId, ctx.userId, 'project.role_revoked', 'project', id, {
      personId: body.personId,
      role: body.role,
    });
    return { ok: true };
  }
}
