import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { IntegrationsService } from './integrations.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntegrationsRead);
    return this.integrations.list(ctx.orgId);
  }

  /** P7-06 integration health: delivery counts + last status per integration. */
  @Get('health')
  async health(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntegrationsRead);
    return this.integrations.health(ctx.orgId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; targetUrl: string; event: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntegrationsWrite);
    return this.integrations.create(ctx.orgId, ctx.userId, body.name, body.targetUrl, body.event);
  }

  @Patch(':id')
  async setActive(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntegrationsWrite);
    return this.integrations.setActive(ctx.orgId, id, body.active);
  }
}
