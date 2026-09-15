import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  COLUMN_TYPES,
  ColumnType,
  QA_GATE_ROLES,
  SEMANTIC_ROLES,
  SemanticRole,
  SYSTEM_COLUMN_TYPES,
  UserContext,
  ViewType,
} from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { DashboardsService } from '../dashboards/dashboards.service';

export interface BoardRow {
  id: string;
  org_id: string;
  workspace_id: string;
  engagement_id: string | null;
  name: string;
  description: string | null;
  is_template: boolean;
  cloned_from: string | null;
  position: number;
}

export interface ColumnRow {
  id: string;
  board_id: string;
  name: string;
  column_type: string;
  config: Record<string, unknown>;
  semantic_role: string | null;
  position: number;
  is_system: boolean;
}

export interface ItemRow {
  id: string;
  board_id: string;
  group_id: string;
  engagement_id: string | null;
  name: string;
  column_values: Record<string, unknown>;
  position: number;
}

/** Column types whose config must carry `labels`. */
const LABEL_TYPES: readonly ColumnType[] = [ColumnType.Status, ColumnType.Dropdown];

/** Roles treated as full-division visibility (spec §14.2 Management). */
const DIVISION_WIDE = ['operations_director', 'platform_owner'];

/**
 * Boards, columns, groups, items and views — the configurable data model from
 * spec §9, with the semantic-role layer from §10.2 that lets dashboards
 * aggregate cross-board, and the guest item scope from §14.1/§14.4.
 *
 * Two rules the spec is explicit about are enforced here:
 *  - a `qa_technical` column cannot pass while an open failed compliance check
 *    exists against the item (§12.5);
 *  - a guest reads exactly the one item named by its `item_scope` (§14.4).
 */
@Injectable()
export class BoardsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly dashboards: DashboardsService,
  ) {}

  /* ---------------- engagements + workspaces ---------------- */

  async createEngagement(
    orgId: string,
    input: { name: string; agencyId?: string | null; projectId?: string | null },
  ) {
    return this.db.one(
      `INSERT INTO engagement (id, org_id, agency_id, project_id, name)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [randomUUID(), orgId, input.agencyId ?? null, input.projectId ?? null, input.name],
    );
  }

  async listEngagements(ctx: UserContext) {
    if (this.isDivisionWide(ctx)) {
      const { rows } = await this.db.query('SELECT * FROM engagement WHERE org_id = $1 ORDER BY created_at DESC', [
        ctx.orgId,
      ]);
      return rows;
    }
    if (!ctx.engagementId) return [];
    const { rows } = await this.db.query('SELECT * FROM engagement WHERE org_id = $1 AND id = $2', [
      ctx.orgId,
      ctx.engagementId,
    ]);
    return rows;
  }

  async createWorkspace(
    orgId: string,
    actorId: string,
    input: { name: string; engagementId?: string | null; workspaceType?: 'client' | 'internal' },
  ) {
    const workspaceType = input.workspaceType ?? (input.engagementId ? 'client' : 'internal');
    if (workspaceType === 'client' && !input.engagementId) {
      throw new BadRequestException('client workspace requires an engagementId');
    }
    return this.db.one(
      `INSERT INTO workspace (id, org_id, engagement_id, name, workspace_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), orgId, input.engagementId ?? null, input.name, workspaceType, actorId],
    );
  }

  async listWorkspaces(ctx: UserContext) {
    if (ctx.itemScope) return [];
    if (this.isDivisionWide(ctx)) {
      const { rows } = await this.db.query(
        'SELECT * FROM workspace WHERE org_id = $1 AND archived_at IS NULL ORDER BY created_at DESC',
        [ctx.orgId],
      );
      return rows;
    }
    const { rows } = await this.db.query(
      `SELECT * FROM workspace WHERE org_id = $1 AND archived_at IS NULL
         AND (engagement_id IS NULL OR engagement_id = $2) ORDER BY created_at DESC`,
      [ctx.orgId, ctx.engagementId ?? '__none__'],
    );
    return rows;
  }

  /* ---------------- boards ---------------- */

  async createBoard(
    ctx: UserContext,
    input: { workspaceId: string; name: string; description?: string; isTemplate?: boolean; clonedFrom?: string | null },
  ): Promise<BoardRow> {
    const workspace = await this.db.oneOrNull<{ id: string; engagement_id: string | null }>(
      'SELECT id, engagement_id FROM workspace WHERE id = $1 AND org_id = $2',
      [input.workspaceId, ctx.orgId],
    );
    if (!workspace) throw new NotFoundException('workspace not found');

    const board = await this.db.one<BoardRow>(
      `INSERT INTO board (id, org_id, workspace_id, engagement_id, name, description, is_template, cloned_from, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        workspace.id,
        workspace.engagement_id,
        input.name,
        input.description ?? null,
        input.isTemplate ?? false,
        input.clonedFrom ?? null,
        ctx.userId,
      ],
    );

    // Every board opens usable: one group plus the two system columns (§9.4).
    await this.db.query('INSERT INTO board_group (id, board_id, name, position) VALUES ($1,$2,$3,0)', [
      randomUUID(),
      board.id,
      'Items',
    ]);
    for (const [i, t] of SYSTEM_COLUMN_TYPES.entries()) {
      await this.db.query(
        `INSERT INTO board_column (id, board_id, name, column_type, is_system, position)
         VALUES ($1,$2,$3,$4,true,$5)`,
        [randomUUID(), board.id, t === ColumnType.CreationLog ? 'Created' : 'Updated', t, 900 + i],
      );
    }

    // Cloning carries semantic roles across (spec §10.2), so a board created
    // from a template is dashboard-ready without hand configuration.
    if (input.clonedFrom) {
      const { rows: cols } = await this.db.query<ColumnRow>(
        'SELECT * FROM board_column WHERE board_id = $1 AND is_system = false ORDER BY position',
        [input.clonedFrom],
      );
      for (const c of cols) {
        await this.db.query(
          `INSERT INTO board_column (id, board_id, name, column_type, config, semantic_role, position)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [randomUUID(), board.id, c.name, c.column_type, JSON.stringify(c.config), c.semantic_role, c.position],
        );
      }
    }

    await this.audit.log(ctx.orgId, ctx.userId, 'board.created', 'board', board.id, { name: board.name });
    return board;
  }

  async listBoards(ctx: UserContext): Promise<BoardRow[]> {
    if (ctx.itemScope) return [];
    if (this.isDivisionWide(ctx)) {
      const { rows } = await this.db.query<BoardRow>(
        'SELECT * FROM board WHERE org_id = $1 AND archived_at IS NULL ORDER BY position, created_at',
        [ctx.orgId],
      );
      return rows;
    }
    const { rows } = await this.db.query<BoardRow>(
      `SELECT * FROM board WHERE org_id = $1 AND archived_at IS NULL
         AND (engagement_id IS NULL OR engagement_id = $2) ORDER BY position, created_at`,
      [ctx.orgId, ctx.engagementId ?? '__none__'],
    );
    return rows;
  }

  async boardDetail(ctx: UserContext, boardId: string) {
    const board = await this.requireBoard(ctx, boardId);
    const [columns, groups, views] = await Promise.all([
      this.db.query<ColumnRow>('SELECT * FROM board_column WHERE board_id = $1 ORDER BY position', [boardId]),
      this.db.query('SELECT * FROM board_group WHERE board_id = $1 ORDER BY position', [boardId]),
      this.db.query('SELECT * FROM board_view WHERE board_id = $1 ORDER BY position', [boardId]),
    ]);
    const items = await this.listItems(ctx, boardId);
    return { board, columns: columns.rows, groups: groups.rows, views: views.rows, items };
  }

  /* ---------------- columns ---------------- */

  async addColumn(
    ctx: UserContext,
    boardId: string,
    input: { name: string; columnType: string; config?: Record<string, unknown>; semanticRole?: string | null },
  ): Promise<ColumnRow> {
    await this.requireBoard(ctx, boardId);
    this.assertColumnType(input.columnType);
    if (SYSTEM_COLUMN_TYPES.includes(input.columnType as ColumnType)) {
      throw new BadRequestException(`${input.columnType} is a system column type`);
    }
    this.assertColumnConfig(input.columnType, input.config ?? {});
    this.assertSemanticRole(input.semanticRole ?? null);

    const pos = await this.db.one<{ next: number }>(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM board_column WHERE board_id = $1',
      [boardId],
    );
    const col = await this.db.one<ColumnRow>(
      `INSERT INTO board_column (id, board_id, name, column_type, config, semantic_role, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        randomUUID(),
        boardId,
        input.name,
        input.columnType,
        JSON.stringify(input.config ?? {}),
        input.semanticRole ?? null,
        pos.next,
      ],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'board.column_added', 'board', boardId, {
      columnType: input.columnType,
      semanticRole: input.semanticRole ?? null,
    });
    return col;
  }

  /* ---------------- items ---------------- */

  async createItem(
    ctx: UserContext,
    boardId: string,
    input: { groupId?: string; name: string; columnValues?: Record<string, unknown> },
  ): Promise<ItemRow> {
    const board = await this.requireBoard(ctx, boardId);
    const groupId =
      input.groupId ??
      (
        await this.db.one<{ id: string }>(
          'SELECT id FROM board_group WHERE board_id = $1 ORDER BY position LIMIT 1',
          [boardId],
        )
      ).id;

    await this.validateColumnValues(boardId, input.columnValues ?? {});
    const pos = await this.db.one<{ next: number }>(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM item WHERE board_id = $1',
      [boardId],
    );
    const item = await this.db.one<ItemRow>(
      `INSERT INTO item (id, org_id, board_id, group_id, engagement_id, name, column_values, position, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        boardId,
        groupId,
        board.engagement_id,
        input.name,
        JSON.stringify(input.columnValues ?? {}),
        pos.next,
        ctx.userId,
      ],
    );
    // Feed the dashboard aggregation step (§10.4) — a no-op when the board has
    // no semantic-role columns.
    await this.dashboards.aggregateItem(ctx.orgId, boardId, item.id, item.column_values);
    return item;
  }

  async listItems(ctx: UserContext, boardId: string): Promise<ItemRow[]> {
    await this.requireBoard(ctx, boardId);
    // Guest: exactly the one scoped item, nothing else (§14.4).
    if (ctx.itemScope) {
      const { rows } = await this.db.query<ItemRow>('SELECT * FROM item WHERE board_id = $1 AND id = $2', [
        boardId,
        ctx.itemScope.replace(/^item:/, ''),
      ]);
      return rows;
    }
    const { rows } = await this.db.query<ItemRow>(
      'SELECT * FROM item WHERE board_id = $1 ORDER BY position, created_at',
      [boardId],
    );
    return rows;
  }

  async getItem(ctx: UserContext, itemId: string): Promise<ItemRow> {
    const item = await this.db.oneOrNull<ItemRow>('SELECT * FROM item WHERE id = $1 AND org_id = $2', [
      itemId,
      ctx.orgId,
    ]);
    if (!item) throw new NotFoundException('item not found');
    if (ctx.itemScope) {
      // A guest asking for anything but its one item gets nothing — no 403 with
      // a hint that the item exists.
      if (ctx.itemScope.replace(/^item:/, '') !== item.id) throw new NotFoundException('item not found');
      return item;
    }
    if (!this.canSeeEngagement(ctx, item.engagement_id)) throw new ForbiddenException('item out of scope');
    return item;
  }

  /**
   * Write the item's column values, enforcing the §12.5 QA-gate/compliance
   * rule: `qa_technical` cannot become passed while a compliance finding is
   * open. Checked at the application layer here, with the same condition cheap
   * to re-check at the data layer.
   */
  async updateItem(
    ctx: UserContext,
    itemId: string,
    patch: { name?: string; columnValues?: Record<string, unknown> },
  ): Promise<ItemRow> {
    const item = await this.getItem(ctx, itemId);
    if (ctx.itemScope) throw new ForbiddenException('guest may comment, not edit');
    await this.validateColumnValues(item.board_id, patch.columnValues ?? {});

    const merged = { ...item.column_values, ...(patch.columnValues ?? {}) };
    await this.assertQaGate(item.id, item.board_id, merged);

    const updated = await this.db.one<ItemRow>(
      `UPDATE item SET name = COALESCE($2, name), column_values = $3, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [itemId, patch.name ?? null, JSON.stringify(merged)],
    );
    await this.dashboards.aggregateItem(ctx.orgId, item.board_id, itemId, updated.column_values);
    await this.audit.log(ctx.orgId, ctx.userId, 'item.updated', 'item', itemId, {
      fields: Object.keys(patch.columnValues ?? {}),
    });
    return updated;
  }

  /**
   * Move an item to `groupId`, ordering it `beforeItemId` when given. The move
   * is a two-step rewrite: the item is parked at a free negative position, the
   * destination list closes up around the gap, then the item is placed. Doing
   * it in one statement would leave the item's own old position in the way.
   */
  async moveItem(
    ctx: UserContext,
    itemId: string,
    input: { groupId: string; beforeItemId?: string },
  ): Promise<ItemRow> {
    const item = await this.getItem(ctx, itemId);
    if (ctx.itemScope) throw new ForbiddenException('guest may comment, not move');
    const group = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM board_group WHERE id = $1 AND board_id = $2',
      [input.groupId, item.board_id],
    );
    if (!group) throw new NotFoundException('group not found');

    let index: number;
    if (input.beforeItemId) {
      const before = await this.db.oneOrNull<{ position: number; group_id: string }>(
        'SELECT position, group_id FROM item WHERE id = $1 AND board_id = $2',
        [input.beforeItemId, item.board_id],
      );
      // A `before` target in another group would silently order against the
      // wrong list, so it is rejected rather than coerced.
      if (!before || before.group_id !== input.groupId) {
        throw new BadRequestException('beforeItemId must be in the destination group');
      }
      index = before.position;
    } else {
      const last = await this.db.one<{ last: number | null }>(
        'SELECT MAX(position) AS last FROM item WHERE group_id = $1',
        [input.groupId],
      );
      index = last.last === null ? 0 : last.last + 1;
    }

    await this.db.query('UPDATE item SET position = $2 WHERE id = $1', [itemId, -1]);
    await this.db.query(
      `UPDATE item SET position = position + 1
       WHERE group_id = $1 AND position >= $2 AND id <> $3`,
      [input.groupId, index, itemId],
    );
    const moved = await this.db.one<ItemRow>(
      `UPDATE item SET group_id = $2, position = $3, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [itemId, input.groupId, index],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'item.moved', 'item', itemId, {
      groupId: input.groupId,
      position: index,
    });
    return moved;
  }

  /**
   * Cross-board item search (§9). A guest reaches nothing here — its one item is
   * served by the scoped read, and a search would let it enumerate the org.
   */
  async searchItems(ctx: UserContext, query: string): Promise<ItemRow[]> {
    if (ctx.itemScope) return [];
    const like = `%${query}%`;
    const { rows } = await this.db.query<ItemRow>(
      `SELECT i.* FROM item i
       JOIN board b ON b.id = i.board_id
       WHERE i.org_id = $1
         AND (i.name ILIKE $2 OR i.column_values::text ILIKE $2)
         AND b.archived_at IS NULL
       ORDER BY i.updated_at DESC
       LIMIT 50`,
      [ctx.orgId, like],
    );
    return rows.filter((r) => this.canSeeEngagement(ctx, r.engagement_id));
  }

  /* ---------------- views ---------------- */

  async addView(
    ctx: UserContext,
    boardId: string,
    input: { name: string; viewType: string; config?: Record<string, unknown>; isDefault?: boolean },
  ) {
    await this.requireBoard(ctx, boardId);
    if (!Object.values(ViewType).includes(input.viewType as ViewType)) {
      throw new BadRequestException(`unknown view type ${input.viewType}`);
    }
    this.assertViewConfig(input.viewType, input.config ?? {});
    const pos = await this.db.one<{ next: number }>(
      'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM board_view WHERE board_id = $1',
      [boardId],
    );
    return this.db.one(
      `INSERT INTO board_view (id, board_id, name, view_type, config, is_default, created_by, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        randomUUID(),
        boardId,
        input.name,
        input.viewType,
        JSON.stringify(input.config ?? {}),
        input.isDefault ?? false,
        ctx.userId,
        pos.next,
      ],
    );
  }

  /* ---------------- guest links (§14.1/§14.5) ---------------- */

  async createGuestLink(ctx: UserContext, input: { itemId: string; email?: string; expiresInDays: number }) {
    if (!Number.isFinite(input.expiresInDays) || input.expiresInDays <= 0 || input.expiresInDays > 90) {
      throw new BadRequestException('expiresInDays must be between 1 and 90');
    }
    const item = await this.getItem(ctx, input.itemId);
    if (!item.engagement_id) {
      throw new BadRequestException('guest links can only scope items with an engagement');
    }
    const token = (randomUUID() + randomUUID()).replace(/-/g, '');
    const link = await this.db.one(
      `INSERT INTO guest_link (id, org_id, engagement_id, item_id, token, email, created_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now() + ($8 || ' days')::interval) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        item.engagement_id,
        item.id,
        token,
        input.email ?? null,
        ctx.userId,
        String(input.expiresInDays),
      ],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'guest.link_created', 'item', item.id, {
      expiresInDays: input.expiresInDays,
    });
    return link;
  }

  async listGuestLinks(ctx: UserContext, itemId?: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM guest_link WHERE org_id = $1 ${itemId ? 'AND item_id = $2' : ''} ORDER BY created_at DESC`,
      itemId ? [ctx.orgId, itemId] : [ctx.orgId],
    );
    return rows;
  }

  /**
   * Resolve a guest token into the claim the gateway would mint (§14.5).
   * Expired or revoked links resolve to nothing — access dies without anyone
   * remembering to revoke it.
   */
  async resolveGuestLink(token: string) {
    const link = await this.db.oneOrNull<{
      org_id: string;
      engagement_id: string;
      item_id: string;
      expires_at: string;
    }>(
      `SELECT * FROM guest_link WHERE token = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [token],
    );
    if (!link) return null;
    return {
      orgId: link.org_id,
      engagementId: link.engagement_id,
      itemScope: `item:${link.item_id}`,
      itemId: link.item_id,
      expiresAt: link.expires_at,
    };
  }

  /* ---------------- semantic-role seam (§10.4) ---------------- */

  /** Columns tagged with a semantic role — the set the aggregator reads. */
  async semanticColumns(boardId: string): Promise<ColumnRow[]> {
    const { rows } = await this.db.query<ColumnRow>(
      'SELECT * FROM board_column WHERE board_id = $1 AND semantic_role IS NOT NULL ORDER BY position',
      [boardId],
    );
    return rows;
  }

  /* ---------------- validation ---------------- */

  private assertColumnType(t: string): void {
    if (!COLUMN_TYPES.includes(t as ColumnType)) throw new BadRequestException(`unknown column type ${t}`);
  }

  private assertSemanticRole(role: string | null): void {
    if (role !== null && !SEMANTIC_ROLES.includes(role as SemanticRole)) {
      throw new BadRequestException(`unknown semantic role ${role}`);
    }
  }

  private assertColumnConfig(type: string, config: Record<string, unknown>): void {
    if (LABEL_TYPES.includes(type as ColumnType)) {
      if (!Array.isArray(config.labels) || config.labels.length === 0) {
        throw new BadRequestException(`${type} requires config.labels`);
      }
    }
    if (type === ColumnType.Formula && typeof config.expression !== 'string') {
      throw new BadRequestException('formula requires config.expression');
    }
    if (type === ColumnType.ConnectBoard && typeof config.linked_board_id !== 'string') {
      throw new BadRequestException('connect_board requires config.linked_board_id');
    }
    if (type === ColumnType.Duration && config.unit !== undefined && config.unit !== 'hours') {
      throw new BadRequestException('duration unit must be hours');
    }
    if (type === ColumnType.Progress && typeof config.source_column_id !== 'string') {
      throw new BadRequestException('progress requires config.source_column_id');
    }
    if (
      type === ColumnType.Dependency &&
      config.relation !== undefined &&
      config.relation !== 'blocks' &&
      config.relation !== 'blocked_by'
    ) {
      throw new BadRequestException('dependency relation must be blocks|blocked_by');
    }
  }

  private assertViewConfig(viewType: string, config: Record<string, unknown>): void {
    const required: Record<string, string> = {
      kanban: 'group_by_column_id',
      gantt: 'date_column_id',
      calendar: 'date_column_id',
      workload: 'person_column_id',
      chart: 'value_column_id',
      gallery: 'files_column_id',
    };
    const key = required[viewType];
    if (key && typeof config[key] !== 'string') {
      throw new BadRequestException(`${viewType} view requires config.${key}`);
    }
  }

  private async validateColumnValues(boardId: string, values: Record<string, unknown>): Promise<void> {
    const ids = Object.keys(values);
    if (!ids.length) return;
    const { rows } = await this.db.query<ColumnRow>('SELECT * FROM board_column WHERE board_id = $1', [boardId]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const id of ids) {
      const col = byId.get(id);
      if (!col) throw new BadRequestException(`column ${id} does not belong to this board`);
      if (col.is_system) throw new BadRequestException(`${col.name} is a system column`);
    }
  }

  private async assertQaGate(itemId: string, boardId: string, merged: Record<string, unknown>): Promise<void> {
    const { rows: cols } = await this.db.query<ColumnRow>(
      'SELECT * FROM board_column WHERE board_id = $1 AND semantic_role = ANY($2)',
      [boardId, [...QA_GATE_ROLES]],
    );
    const technical = cols.find((c) => c.semantic_role === SemanticRole.QaTechnical);
    if (!technical) return;
    if (!this.statusValueIsPassed(technical, merged[technical.id])) return;

    const { rows } = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM compliance_check WHERE item_id = $1 AND status = 'failed'`,
      [itemId],
    );
    if (Number(rows[0].n) > 0) {
      throw new BadRequestException(
        'qa_technical cannot pass while the White-Label Compliance Guard has an open finding (§12.5)',
      );
    }
  }

  private statusValueIsPassed(col: ColumnRow, value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'passed') return true;
      const labels = (col.config?.labels ?? []) as Array<{ id?: string; text?: string }>;
      const match = labels.find((l) => l.id === value);
      return (match?.text ?? '').toLowerCase() === 'passed';
    }
    if (typeof value === 'object' && value !== null && 'label' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).label).toLowerCase() === 'passed';
    }
    return false;
  }

  private async requireBoard(ctx: UserContext, boardId: string): Promise<BoardRow> {
    const board = await this.db.oneOrNull<BoardRow>('SELECT * FROM board WHERE id = $1 AND org_id = $2', [
      boardId,
      ctx.orgId,
    ]);
    if (!board) throw new NotFoundException('board not found');
    // Guests never see the board an item lives on (§14.3).
    if (ctx.itemScope) throw new ForbiddenException('guest cannot read boards');
    if (!this.canSeeEngagement(ctx, board.engagement_id)) throw new ForbiddenException('board out of scope');
    return board;
  }

  private isDivisionWide(ctx: UserContext): boolean {
    return ctx.roles.some((r) => DIVISION_WIDE.includes(r as string));
  }

  private canSeeEngagement(ctx: UserContext, engagementId: string | null): boolean {
    // Internal (engagement-less) resources are staff-only.
    if (engagementId === null) return !ctx.itemScope;
    if (this.isDivisionWide(ctx)) return true;
    if (ctx.engagementId) return ctx.engagementId === engagementId;
    // Legacy agency/project scopes keep working for un-migrated users.
    return ctx.scopes.some((s) => s.workspaceId === engagementId);
  }
}