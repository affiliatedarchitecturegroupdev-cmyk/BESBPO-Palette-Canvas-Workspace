import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { CommercialService, EstimateLineInput, RateCardEntryInput } from './commercial.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('commercial')
export class CommercialController {
  constructor(
    private readonly commercial: CommercialService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get('rate-cards')
  async rateCards(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialRead);
    return this.commercial.listRateCards(ctx.orgId);
  }

  @Post('rate-cards')
  async createRateCard(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; currency?: string; entries?: RateCardEntryInput[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialWrite);
    const card = await this.commercial.createRateCard(ctx.orgId, ctx.userId, body.name, body.currency ?? 'USD', body.entries ?? []);
    await this.audit.log(ctx.orgId, ctx.userId, 'rate_card.created', 'rate_card', (card as { id: string }).id, { name: body.name });
    return card;
  }

  @Get('projects/:projectId/estimates')
  async estimates(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialRead);
    return this.commercial.listEstimates(ctx.orgId, projectId);
  }

  @Post('projects/:projectId/estimates')
  async createEstimate(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { notes?: string; lines?: EstimateLineInput[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialWrite);
    const est = await this.commercial.createEstimate(ctx.orgId, projectId, ctx.userId, body.notes ?? '', body.lines ?? []);
    await this.audit.log(ctx.orgId, ctx.userId, 'estimate.created', 'estimate', (est as { id: string }).id, {
      projectId, version: (est as { version: number }).version,
    });
    return est;
  }

  @Post('estimates/:id/status')
  async estimateStatus(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: 'submitted' | 'approved' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialWrite);
    const est = await this.commercial.setEstimateStatus(ctx.orgId, id, body.status);
    if (!est) throw new NotFoundException('estimate not found');
    await this.audit.log(ctx.orgId, ctx.userId, `estimate.${body.status}`, 'estimate', id, {});
    return est;
  }

  @Get('projects/:projectId/budget')
  async budget(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialRead);
    const row = await this.commercial.budgetVsEffort(ctx.orgId, projectId);
    if (!row) throw new NotFoundException('project not found');
    return row;
  }

  @Patch('projects/:projectId')
  async setFields(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { poNumber?: string | null; budgetAmount?: number | null },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialWrite);
    const row = await this.commercial.setCommercialFields(ctx.orgId, projectId, body.poNumber ?? null, body.budgetAmount ?? null);
    if (!row) throw new NotFoundException('project not found');
    await this.audit.log(ctx.orgId, ctx.userId, 'project.commercial_updated', 'project', projectId, {
      poNumber: body.poNumber, budgetAmount: body.budgetAmount,
    });
    return row;
  }

  @Post('milestones/:id/invoice-ready')
  async invoiceReady(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { ready: boolean; amount?: number | null },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialWrite);
    const row = await this.commercial.setInvoiceReady(ctx.orgId, id, body.ready, body.amount ?? null);
    if (!row) throw new NotFoundException('milestone not found');
    await this.audit.log(ctx.orgId, ctx.userId, 'milestone.invoice_ready', 'milestone', id, { ready: body.ready });
    return row;
  }

  @Get('invoice-ready')
  async invoiceReadyList(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommercialRead);
    return this.commercial.invoiceReady(ctx.orgId);
  }
}
