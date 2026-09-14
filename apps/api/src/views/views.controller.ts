import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { ViewsService } from './views.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('views')
export class ViewsController {
  constructor(
    private readonly views: ViewsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('projectId') projectId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ViewsManage);
    return this.views.list(ctx.orgId, projectId ?? '', ctx.userId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { projectId: string; name: string; kind?: string; filters?: Record<string, unknown>; shared?: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ViewsManage);
    return this.views.create(ctx.orgId, ctx.userId, body);
  }

  @Patch(':id')
  async patch(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { name?: string; kind?: string; filters?: Record<string, unknown>; shared?: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ViewsManage);
    return this.views.patch(ctx.orgId, id, body);
  }
}