import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ColumnType,
  DashboardScopeRole,
  SemanticRole,
  UserContext,
  WidgetAggregation,
} from '@palette-canvas/shared';
import { Database } from '../db/database';

export interface MetricRow {
  id: string;
  org_id: string;
  engagement_id: string | null;
  board_id: string;
  item_id: string;
  semantic_role: string;
  numeric_value: number | null;
  text_value: string | null;
}

/** Widget catalog (spec §10.6) with the role each one aggregates. */
const WIDGET_ROLES: Record<string, SemanticRole> = {
  capacity_kpi: SemanticRole.CapacityHours,
  qa_pass_rate: SemanticRole.QaTechnical,
  turnaround_chart: SemanticRole.TurnaroundEnd,
  engagement_health: SemanticRole.ProductionStage,
  commercial_rollup: SemanticRole.RevenueValue,
  workload_leaderboard: SemanticRole.StaffedPerson,
};

/**
 * Cross-board dashboards (spec §10).
 *
 * The architecture mandates one direction of flow: board writes feed an
 * aggregation step, and dashboards read only the aggregated metrics. There is
 * deliberately no query path from a widget to a source row — that is what keeps
 * a dashboard fast at scale and keeps the collision risk down to widget-definition
 * conflicts. Two roles are never permitted to own the same widget (§10.5): the
 * scope is resolved during read, not stored per user.
 */
@Injectable()
export class DashboardsService {
  constructor(private readonly db: Database) {}

  /* ---------------- aggregation consumer (§10.4) ---------------- */

  /**
   * Called on every item write. Extract the item's semantic-role-tagged column
   * values into `dashboard_metric`. Untagged columns are a no-op, so a board
   * with no semantic roles costs nothing.
   */
  async aggregateItem(
    orgId: string,
    boardId: string,
    itemId: string,
    columnValues: Record<string, unknown>,
  ): Promise<number> {
    const { rows: cols } = await this.db.query<{ id: string; semantic_role: string; column_type: string }>(
      'SELECT id, semantic_role, column_type FROM board_column WHERE board_id = $1 AND semantic_role IS NOT NULL',
      [boardId],
    );
    if (!cols.length) return 0;

    const item = await this.db.oneOrNull<{ engagement_id: string | null }>(
      'SELECT engagement_id FROM item WHERE id = $1',
      [itemId],
    );
    if (!item) throw new NotFoundException('item not found');

    let written = 0;
    for (const col of cols) {
      const raw = columnValues[col.id];
      const numeric = this.toNumeric(col.column_type, raw);
      const text = numeric === null ? this.toText(raw) : null;
      if (numeric === null && text === null) {
        await this.db.query('DELETE FROM dashboard_metric WHERE item_id = $1 AND semantic_role = $2', [
          itemId,
          col.semantic_role,
        ]);
        continue;
      }
      await this.db.query(
        `INSERT INTO dashboard_metric (id, org_id, engagement_id, board_id, item_id, semantic_role, numeric_value, text_value, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
         ON CONFLICT (item_id, semantic_role)
         DO UPDATE SET numeric_value = EXCLUDED.numeric_value, text_value = EXCLUDED.text_value,
                       recorded_at = now(), engagement_id = EXCLUDED.engagement_id`,
        [randomUUID(), orgId, item.engagement_id, boardId, itemId, col.semantic_role, numeric, text],
      );
      written++;
    }
    return written;
  }

  /** Backfill a board's existing items — used when a role is added later. */
  async backfillBoard(orgId: string, boardId: string): Promise<number> {
    const { rows } = await this.db.query<{ id: string; column_values: Record<string, unknown> }>(
      'SELECT id, column_values FROM item WHERE board_id = $1',
      [boardId],
    );
    let total = 0;
    for (const item of rows) {
      total += await this.aggregateItem(orgId, boardId, item.id, item.column_values);
    }
    return total;
  }

  /* ---------------- dashboards ---------------- */

  async createDashboard(
    ctx: UserContext,
    input: { name: string; scopeRole: string; engagementId?: string | null; widgets?: string[] },
  ) {
    if (!Object.values(DashboardScopeRole).includes(input.scopeRole as DashboardScopeRole)) {
      throw new BadRequestException(`unknown dashboard scope ${input.scopeRole}`);
    }
    if (input.scopeRole !== DashboardScopeRole.Management && !input.engagementId) {
      throw new BadRequestException('account-manager and client dashboards are engagement-scoped');
    }
    const dashboard = await this.db.one<{ id: string }>(
      `INSERT INTO dashboard (id, org_id, scope_role, engagement_id, name, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), ctx.orgId, input.scopeRole, input.engagementId ?? null, input.name, ctx.userId],
    );
    for (const [i, widgetType] of (input.widgets ?? []).entries()) {
      await this.addWidget(ctx, dashboard.id, { name: widgetType, widgetType, position: i });
    }
    return dashboard;
  }

  async addWidget(
    ctx: UserContext,
    dashboardId: string,
    input: { name: string; widgetType: string; semanticRole?: string | null; aggregation?: string; position?: number },
  ) {
    if (!WIDGET_ROLES[input.widgetType]) {
      throw new BadRequestException(`unknown widget type ${input.widgetType}`);
    }
    const role = (input.semanticRole ?? WIDGET_ROLES[input.widgetType]) as string;
    const aggregation = input.aggregation ?? (input.widgetType === 'qa_pass_rate' ? 'pass_rate' : 'sum');
    if (!Object.values(WidgetAggregation).includes(aggregation as WidgetAggregation)) {
      throw new BadRequestException(`unknown aggregation ${aggregation}`);
    }
    return this.db.one(
      `INSERT INTO dashboard_widget (id, dashboard_id, name, widget_type, semantic_role, aggregation, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), dashboardId, input.name, input.widgetType, role, aggregation, input.position ?? 0],
    );
  }

  /**
   * Resolve which dashboards a caller may see from its role alone (§10.5) —
   * the client sees exactly its own engagement, the account manager its
   * portfolio, management everything. No per-user dashboard rows exist.
   */
  async listDashboards(ctx: UserContext) {
    const roles = ctx.roles as string[];
    let scope: DashboardScopeRole;
    if (roles.includes('client_approver') || roles.includes('third_party_vendor')) {
      scope = DashboardScopeRole.Client;
    } else if (roles.includes('account_manager') || roles.includes('agency_admin')) {
      scope = DashboardScopeRole.AccountManager;
    } else if (roles.includes('operations_director') || roles.includes('platform_owner')) {
      scope = DashboardScopeRole.Management;
    } else {
      return [];
    }
    if (ctx.itemScope) return [];

    if (scope === DashboardScopeRole.Management) {
      const { rows } = await this.db.query(
        'SELECT * FROM dashboard WHERE org_id = $1 AND scope_role = $2 ORDER BY created_at DESC',
        [ctx.orgId, scope],
      );
      return rows;
    }
    const { rows } = await this.db.query(
      `SELECT * FROM dashboard WHERE org_id = $1 AND scope_role = $2 AND engagement_id = $3
       ORDER BY created_at DESC`,
      [ctx.orgId, scope, ctx.engagementId ?? '__none__'],
    );
    return rows;
  }

  /** Dashboard with its widgets resolved into aggregated values. */
  async render(ctx: UserContext, dashboardId: string) {
    const dashboard = await this.db.oneOrNull<{ id: string; scope_role: string; engagement_id: string | null; org_id: string }>(
      'SELECT * FROM dashboard WHERE id = $1 AND org_id = $2',
      [dashboardId, ctx.orgId],
    );
    if (!dashboard) throw new NotFoundException('dashboard not found');

    const roles = ctx.roles as string[];
    const isClient = roles.includes('client_approver') || roles.includes('third_party_vendor');
    // A client can only ever render its own engagement's dashboard.
    if (isClient && dashboard.engagement_id !== ctx.engagementId) {
      throw new ForbiddenException('dashboard out of scope');
    }

    const { rows: widgets } = await this.db.query<{
      id: string;
      name: string;
      widget_type: string;
      semantic_role: string;
      aggregation: string;
    }>('SELECT * FROM dashboard_widget WHERE dashboard_id = $1 ORDER BY position', [dashboardId]);

    const values = [];
    for (const w of widgets) {
      values.push({ ...w, value: await this.metricValue(dashboard.engagement_id, w.semantic_role, w.aggregation) });
    }
    return { dashboard, widgets: values };
  }

  /**
   * The single aggregation query every widget shares. Reads only
   * `dashboard_metric` — never a board or item row directly (§10.4).
   */
  async metricValue(
    engagementId: string | null,
    semanticRole: string,
    aggregation: string,
  ): Promise<number | null> {
    if (aggregation === WidgetAggregation.PassRate) {
      const { rows } = await this.db.query<{ passed: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE LOWER(COALESCE(text_value,'')) = 'passed')::text AS passed,
           COUNT(*)::text AS total
         FROM dashboard_metric
         WHERE semantic_role = $1 AND ($2::text IS NULL OR engagement_id = $2)`,
        [semanticRole, engagementId],
      );
      const total = Number(rows[0].total);
      if (total === 0) return null;
      return Math.round((Number(rows[0].passed) / total) * 1000) / 10;
    }
    const fn: Record<string, string> = { sum: 'SUM', avg: 'AVG', count: 'COUNT', min: 'MIN', max: 'MAX' };
    const sql = fn[aggregation];
    if (!sql) throw new BadRequestException(`unknown aggregation ${aggregation}`);
    const { rows } = await this.db.query<{ v: number | null }>(
      `SELECT ${sql}(numeric_value) AS v FROM dashboard_metric
       WHERE semantic_role = $1 AND ($2::text IS NULL OR engagement_id = $2)`,
      [semanticRole, engagementId],
    );
    return rows[0].v === null ? null : Number(rows[0].v);
  }

  /** Widget types available in the catalog (§10.6). */
  widgetCatalog() {
    return Object.entries(WIDGET_ROLES).map(([widgetType, semanticRole]) => ({ widgetType, semanticRole }));
  }

  /* ---------------- coercion ---------------- */

  private toNumeric(columnType: string, raw: unknown): number | null {
    if (raw === undefined || raw === null) return null;
    switch (columnType) {
      case ColumnType.Number:
      case ColumnType.Rating:
      case ColumnType.Progress:
      case ColumnType.Duration:
      case ColumnType.Vote:
        return typeof raw === 'number' ? raw : Number(raw);
      case ColumnType.Checkbox:
        return raw === true || raw === 'true' ? 1 : 0;
      default:
        return null;
    }
  }

  private toText(raw: unknown): string | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.label === 'string') return obj.label;
      if (typeof obj.text === 'string') return obj.text;
      if (typeof obj.value === 'string') return obj.value;
      if (Array.isArray(raw)) return raw.map(String).join(', ');
    }
    return String(raw);
  }
}