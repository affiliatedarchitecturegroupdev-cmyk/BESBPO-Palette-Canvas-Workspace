import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { CapacityService } from './capacity.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('capacity')
export class CapacityController {
  constructor(
    private readonly capacity: CapacityService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async byPerson(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CapacityRead);
    return this.capacity.byPerson(ctx.orgId);
  }

  @Get('skills')
  async skills(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CapacityRead);
    return this.capacity.skillCoverage(ctx.orgId);
  }

  @Post('skills')
  async addSkill(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CapacityWrite);
    return this.capacity.addSkill(ctx.orgId, body.name);
  }

  @Post('people/:personId')
  async setCapacity(
    @Headers('x-user-email') email: string | undefined,
    @Param('personId') personId: string,
    @Body() body: { weeklyHours: number; thresholdPct: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CapacityWrite);
    return this.capacity.upsertCapacity(ctx.orgId, personId, body.weeklyHours, body.thresholdPct);
  }

  @Post('people/:personId/skills')
  async assignSkill(
    @Headers('x-user-email') email: string | undefined,
    @Param('personId') personId: string,
    @Body() body: { skillId: string; level: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CapacityWrite);
    return this.capacity.assignSkill(ctx.orgId, personId, body.skillId, body.level);
  }
}
