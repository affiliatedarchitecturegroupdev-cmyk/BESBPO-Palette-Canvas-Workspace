import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { TemplatesService, TemplateDefinition } from './templates.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('templates')
export class TemplatesController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.TemplatesRead);
    return this.templates.list(ctx.orgId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { key: string; name: string; definition: TemplateDefinition },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.TemplatesManage);
    const row = await this.templates.createVersion(ctx.orgId, body.key, body.name, body.definition);
    await this.audit.log(ctx.orgId, ctx.userId, 'template.version_created', 'service_template', row.id, {
      key: body.key,
      version: row.version,
    });
    return row;
  }
}
