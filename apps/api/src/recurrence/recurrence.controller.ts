import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { RecurrenceService } from './recurrence.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('recurrences')
export class RecurrenceController {
  constructor(
    private readonly recurrence: RecurrenceService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('projectId') projectId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RecurrenceManage);
    return this.recurrence.list(ctx.orgId, projectId ?? '');
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { projectId: string; cadence?: string; intervalDays?: number; baseTaskId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RecurrenceManage);
    return this.recurrence.create(ctx.orgId, ctx.userId, body);
  }

  @Post(':id/tick')
  async tick(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RecurrenceManage);
    return this.recurrence.tick(ctx.orgId, ctx.userId, id);
  }

  @Post(':id/active')
  async setActive(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RecurrenceManage);
    return this.recurrence.setActive(ctx.orgId, ctx.userId, id, body.active);
  }
}