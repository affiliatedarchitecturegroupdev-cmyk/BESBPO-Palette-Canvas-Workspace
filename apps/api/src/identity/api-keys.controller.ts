import { Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { ApiKeysService } from './api-keys.service';
import { IdentityService } from './identity.service';
import { AuthzService } from './authz.service';

@Controller('identity/api-keys')
export class ApiKeysController {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoManage);
    return this.keys.list(ctx.orgId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoManage);
    return this.keys.create(ctx.orgId, ctx.userId, body.name);
  }

  @Delete(':id')
  async revoke(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IdentitySsoManage);
    return this.keys.revoke(ctx.orgId, id, ctx.userId);
  }
}
