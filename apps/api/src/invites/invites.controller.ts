import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { InvitesService } from './invites.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('all') all?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.InvitesManage);
    return this.invites.list(ctx.orgId, all === 'true');
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { email: string; role: string; scopeType: string; scopeId: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.InvitesManage);
    return this.invites.create(ctx.orgId, ctx.userId, body);
  }

  /** Self-service accept: the token is the credential - no session required (P8-01) */
  @Post('accept')
  async accept(@Body() body: { token: string; email?: string; name?: string }) {
    return this.invites.accept(body.token.trim(), body.email ?? '', body.name ?? '');
  }

  @Post(':id/revoke')
  async revoke(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.InvitesManage);
    return this.invites.revoke(ctx.orgId, ctx.userId, id);
  }
}