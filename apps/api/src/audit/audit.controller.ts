import { Controller, Get, Headers, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { AuditService, AuditRow } from './audit.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(
    @Headers('x-user-email') email: string | undefined,
    @Query('action') action?: string,
    @Query('actor') actor?: string,
    @Query('targetType') targetType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ): Promise<AuditRow[]> {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AuditRead);
    if (action || actor || targetType || from || to || q) {
      return this.audit.search(ctx.orgId, { action, actor, targetType, from, to, q });
    }
    return this.audit.findAll(ctx.orgId);
  }
}
