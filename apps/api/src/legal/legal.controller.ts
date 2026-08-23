import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { LegalService } from './legal.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('legal')
export class LegalController {
  constructor(
    private readonly legal: LegalService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get('holds')
  async holds(@Headers('x-user-email') email: string | undefined, @Query('all') all?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.LegalHoldManage);
    return this.legal.listHolds(ctx.orgId, all === 'true');
  }

  @Post('holds')
  async setHold(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { scopeType: string; scopeId: string; reason: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.LegalHoldManage);
    return this.legal.setHold(ctx.orgId, ctx.userId, body.scopeType, body.scopeId, body.reason);
  }

  @Post('holds/:id/release')
  async release(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.LegalHoldManage);
    return this.legal.releaseHold(ctx.orgId, ctx.userId, id);
  }

  @Get('retention')
  async getRetention(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RetentionManage);
    return { days: await this.legal.getRetention(ctx.orgId) };
  }

  @Post('retention')
  async setRetention(@Headers('x-user-email') email: string | undefined, @Body() body: { days: number }) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RetentionManage);
    return { days: await this.legal.setRetention(ctx.orgId, ctx.userId, body.days) };
  }

  @Post('purge')
  async purge(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RetentionManage);
    return this.legal.purge(ctx.orgId, ctx.userId);
  }
}
