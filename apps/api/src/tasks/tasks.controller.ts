import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Capability } from '@palette-canvas/shared';
import { TasksService, TaskCreateInput, TaskUpdateInput } from './tasks.service';
import { WorkstreamsService } from '../workstreams/workstream.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly workstreams: WorkstreamsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  private async getCtx(email: string | undefined, required: Capability = Capability.TasksRead) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, required);
    return ctx;
  }

  /** Board view grouped into template-defined columns. */
  @Get('project/:projectId')
  async board(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.getCtx(email);
    const tasks = await this.tasks.board(ctx.orgId, projectId);
    return { columns: groupByStatus(tasks), tasks };
  }

  /** Calendar/list view (same data model, due-date driven). */
  @Get('project/:projectId/calendar')
  async calendar(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.getCtx(email);
    return this.tasks.calendar(ctx.orgId, projectId);
  }

  @Post(':projectId/workstreams')
  async createWorkstream(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { name: string; id?: string },
  ) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    const ws = await this.workstreams.create(projectId, body.name, body.id ?? randomUUID());
    await this.audit.log(ctx.orgId, ctx.userId, 'workstream.created', 'workstream', ws.id, {
      projectId,
      name: body.name,
    });
    return ws;
  }

  @Get(':projectId/workstreams')
  async listWorkstreams(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.getCtx(email);
    return this.workstreams.list(projectId);
  }

  @Post()
  async create(@Headers('x-user-email') email: string | undefined, @Body() body: TaskCreateInput) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    const task = await this.tasks.create(ctx.orgId, ctx.userId, body);
    await this.audit.log(ctx.orgId, ctx.userId, 'task.created', 'task', task.id, {
      projectId: body.projectId,
      title: body.title,
    });
    return task;
  }

  @Patch(':id')
  async update(@Headers('x-user-email') email: string | undefined, @Param('id') id: string, @Body() body: TaskUpdateInput) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    const task = await this.tasks.update(ctx.orgId, id, body);
    await this.audit.log(ctx.orgId, ctx.userId, 'task.updated', 'task', id, { ...body });
    return task;
  }

  @Get(':id')
  async detail(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.getCtx(email);
    const [checklist, dependencies, collaborators] = await Promise.all([
      this.tasks.checklist(id),
      this.tasks.dependencies(ctx.orgId, id),
      this.tasks.collaborators(id),
    ]);
    return { checklist, dependencies, collaborators };
  }

  @Post(':id/dependencies')
  async addDependency(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { dependsOn: string },
  ) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    await this.tasks.addDependency(ctx.orgId, id, body.dependsOn);
    await this.audit.log(ctx.orgId, ctx.userId, 'task.dependency_added', 'task', id, {
      dependsOn: body.dependsOn,
    });
    return { ok: true };
  }

  @Post(':id/checklist')
  async addChecklistItem(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { label: string },
  ) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    return this.tasks.addChecklistItem(id, body.label);
  }

  @Post(':id/checklist/:itemId/toggle')
  async toggleChecklist(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
  ) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    return this.tasks.toggleChecklistItem(itemId);
  }

  @Post(':id/collaborators')
  async addCollaborator(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { personId: string },
  ) {
    const ctx = await this.getCtx(email, Capability.TasksWrite);
    await this.tasks.addCollaborator(id, body.personId);
    return { ok: true };
  }
}

function groupByStatus(tasks: { status: string }[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of tasks) {
    map[t.status] = map[t.status] || [];
  }
  return map;
}
