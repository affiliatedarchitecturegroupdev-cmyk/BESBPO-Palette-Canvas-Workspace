import { Controller, Get, Headers } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { ReportsService } from './reports.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get('utilisation')
  async utilisation(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReportsRead);
    return this.reports.utilisation(ctx.orgId);
  }

  @Get('effort')
  async effort(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReportsRead);
    return this.reports.effortByProject(ctx.orgId);
  }

  @Get('portfolio')
  async portfolio(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReportsRead);
    return this.reports.portfolio(ctx.orgId);
  }

  @Get('sla')
  async sla(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReportsRead);
    return this.reports.sla(ctx.orgId);
  }
}
