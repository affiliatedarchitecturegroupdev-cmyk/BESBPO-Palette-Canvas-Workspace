import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { ExportsService } from './exports.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('exports')
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ExportsManage);
    return this.exports.list(ctx.orgId);
  }

  @Post()
  async record(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { kind: string; format: string; rowCount?: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ExportsManage);
    return this.exports.record(ctx.orgId, ctx.userId, body);
  }
}