import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { DeliverablesService } from './deliverables.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('deliverables')
export class DeliverablesController {
  constructor(
    private readonly deliverables: DeliverablesService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get('project/:projectId')
  async list(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DeliverablesRead);
    return this.deliverables.list(ctx.orgId, projectId);
  }

  @Post('project/:projectId')
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body()
    body: { name: string; deliverableType?: string; workstreamId?: string; dueDate?: string; assigneeId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DeliverablesWrite);
    const d = await this.deliverables.create(ctx.orgId, projectId, body);
    await this.audit.log(ctx.orgId, ctx.userId, 'deliverable.created', 'deliverable', d.id, {
      projectId,
      name: body.name,
    });
    return d;
  }

  @Patch(':id/status')
  async setStatus(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DeliverablesWrite);
    const d = await this.deliverables.setStatus(ctx.orgId, id, body.status);
    await this.audit.log(ctx.orgId, ctx.userId, 'deliverable.status_changed', 'deliverable', id, {
      to: body.status,
    });
    return d;
  }

  @Get(':id/tasks')
  async tasks(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DeliverablesRead);
    return this.deliverables.tasksFor(ctx.orgId, id);
  }
}
