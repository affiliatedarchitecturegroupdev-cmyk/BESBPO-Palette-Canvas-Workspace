import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { TriageService, TriageInput } from './triage.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('triage')
export class TriageController {
  constructor(
    private readonly triage: TriageService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Post(':briefId')
  async decide(
    @Headers('x-user-email') email: string | undefined,
    @Param('briefId') briefId: string,
    @Body() body: TriageInput,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntakeTriage);
    const brief = await this.triage.decide(ctx.orgId, briefId, ctx.userId, body);
    await this.audit.log(ctx.orgId, ctx.userId, 'brief.triaged', 'brief', briefId, {
      decision: body.decision,
      estimateHours: body.estimateHours ?? null,
      riskFlags: body.riskFlags ?? [],
    });
    return brief;
  }
}
