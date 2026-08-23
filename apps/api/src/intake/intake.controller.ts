import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { IntakeService, CreateBriefInput } from './intake.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('intake')
export class IntakeController {
  constructor(
    private readonly intake: IntakeService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async inbox(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    return this.intake.listInbox(ctx.orgId, this.authz.agencyFilter(ctx));
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: CreateBriefInput,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntakeCreate);
    if (!this.authz.canAccessAgency(ctx, body.agencyId)) {
      throw new ForbiddenException('agency outside your scope');
    }
    const brief = await this.intake.create(ctx.orgId, ctx.userId, body);
    await this.audit.log(ctx.orgId, ctx.userId, 'brief.created', 'brief', brief.id, {
      title: brief.title,
      templateId: brief.template_id,
      duplicateOf: brief.duplicate_of,
    });
    return brief;
  }

  @Get(':id')
  async get(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    return this.intake.get(ctx.orgId, id);
  }
}
