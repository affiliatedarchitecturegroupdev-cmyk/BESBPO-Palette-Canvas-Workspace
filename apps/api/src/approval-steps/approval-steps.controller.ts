import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { ApprovalStepsService } from './approval-steps.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('approval-steps')
export class ApprovalStepsController {
  constructor(
    private readonly steps: ApprovalStepsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('projectId') projectId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalStepsWrite);
    return this.steps.list(ctx.orgId, projectId ?? '');
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { projectId: string; name: string; position?: number; requiredRole?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalStepsWrite);
    return this.steps.create(ctx.orgId, ctx.userId, body.projectId, body);
  }

  @Post(':id/complete')
  async complete(@Headers('x-user-email') email: string | undefined,@Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalStepsWrite);
    return this.steps.complete(ctx.orgId, ctx.userId, id);
  }

  @Get('progress')
  async progress(@Headers('x-user-email') email: string | undefined,@Query('projectId') projectId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ProjectsRead);
    return this.steps.progress(ctx.orgId, projectId ?? '');
  }
}