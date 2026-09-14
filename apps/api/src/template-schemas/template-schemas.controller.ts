import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { TemplateSchemasService } from './template-schemas.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('template-schemas')
export class TemplateSchemasController {
  constructor(
    private readonly templates: TemplateSchemasService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined,@Query('workstreamId') workstreamId?: string) {
    const ctx = await this.identity.resolve(email);
    return this.templates.list(ctx.orgId, workstreamId ?? '');
  }

  @Get(':id')
  async get(@Headers('x-user-email') email: string | undefined,@Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    return this.templates.get(ctx.orgId, id);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { workstreamId: string; name: string; description?: string; schema: unknown },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.TemplatesManage);
    return this.templates.create(ctx.orgId, ctx.userId, body.workstreamId, body);
  }
}