import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { DashboardsService } from './dashboards.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly dashboards: DashboardsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  /** Widget catalog (spec §10.6) — drives the dashboard builder UI. */
  @Get('widget-catalog')
  widgetCatalog() {
    return { widgets: this.dashboards.widgetCatalog() };
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; scopeRole: string; engagementId?: string; widgets?: string[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DashboardsManage);
    return this.dashboards.createDashboard(ctx, body);
  }

  @Get()
  async list(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DashboardsRead);
    return this.dashboards.listDashboards(ctx);
  }

  @Get(':id')
  async render(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DashboardsRead);
    return this.dashboards.render(ctx, id);
  }

  @Post(':id/widgets')
  async addWidget(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') dashboardId: string,
    @Body() body: { name: string; widgetType: string; semanticRole?: string; aggregation?: string; position?: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DashboardsManage);
    return this.dashboards.addWidget(ctx, dashboardId, body);
  }

  /** Backfill metrics for an existing board (used when a role is added later). */
  @Post('boards/:boardId/backfill')
  async backfill(@Headers('x-user-email') email: string | undefined, @Param('boardId') boardId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DashboardsManage);
    return { written: await this.dashboards.backfillBoard(ctx.orgId, boardId) };
  }
}