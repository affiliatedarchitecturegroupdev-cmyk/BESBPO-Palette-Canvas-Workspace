import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { AutomationsService, RuleAction, RuleCondition } from './automations.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('automations')
export class AutomationsController {
  constructor(
    private readonly automations: AutomationsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AutomationsRead);
    return this.automations.list(ctx.orgId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; triggerEvent: string; condition?: RuleCondition[]; action: RuleAction },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AutomationsWrite);
    const rule = await this.automations.create(ctx.orgId, ctx.userId, body.name, body.triggerEvent, body.condition ?? [], body.action);
    await this.audit.log(ctx.orgId, ctx.userId, 'automation.created', 'automation_rule', (rule as { id: string }).id, { name: body.name });
    return rule;
  }

  @Patch(':id')
  async setActive(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { active: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AutomationsWrite);
    return this.automations.setActive(ctx.orgId, id, body.active);
  }

  @Get('runs')
  async runs(@Headers('x-user-email') email: string | undefined, @Query('ruleId') ruleId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AutomationsRead);
    return this.automations.runs(ctx.orgId, ruleId);
  }
}
