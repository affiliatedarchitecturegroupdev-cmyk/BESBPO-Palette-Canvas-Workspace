import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
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
  async list(@Headers('x-user-email') email: string | undefined): Promise<AuditRow[]> {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AuditRead);
    return this.audit.findAll(ctx.orgId);
  }
}
