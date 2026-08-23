import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { WorkloadService } from './workload.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('workload')
export class WorkloadController {
  constructor(
    private readonly workload: WorkloadService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async byPerson(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.WorkloadRead);
    return this.workload.byPerson(ctx.orgId);
  }

  @Post('tasks/:taskId/time')
  async logTime(
    @Headers('x-user-email') email: string | undefined,
    @Param('taskId') taskId: string,
    @Body() body: { hours: number; note?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.TimeLog);
    return this.workload.logTime(ctx.orgId, ctx.userId, taskId, body.hours, body.note);
  }

  @Get('tasks/:taskId/time')
  async taskTimes(@Headers('x-user-email') email: string | undefined, @Param('taskId') taskId: string) {
    const ctx = await this.identity.resolve(email);
    return this.workload.timesFor(taskId);
  }
}
