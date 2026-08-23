import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { SsoService } from './sso.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('identity/sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoRead);
    return this.sso.list(ctx.orgId);
  }

  @Post()
  async configure(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { issuer: string; clientId: string; mfaRequired?: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoManage);
    return this.sso.upsert(ctx.orgId, ctx.userId, body.issuer, body.clientId, body.mfaRequired ?? false);
  }

  @Get('scim/users')
  async scimUsers(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoRead);
    return this.sso.scimIdentities(ctx.orgId);
  }

  /** SCIM provisioning endpoint — guarded by the org's SCIM bearer token, not a user session. */
  @Post('scim/users')
  async scimProvision(
    @Headers('x-user-email') email: string | undefined,
    @Headers('authorization') auth: string | undefined,
    @Body() body: { externalId: string; email: string; name: string; active?: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoManage);
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    return this.sso.scimUpsertUser(ctx.orgId, token, body);
  }
}
