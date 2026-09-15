import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Capability, SEMANTIC_ROLES, UserContext } from '@palette-canvas/shared';
import { BoardsService } from './boards.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { ComplianceService } from '../compliance/compliance.service';

/**
 * V2 §9 board surface. Reads are capability-gated on `boards.read`; structural
 * writes on `boards.write`; item writes on `items.write`. Guests never reach
 * these routes with a board capability — their one scoped item is served by the
 * scoped read on `/boards/items/:id`.
 */
@Controller('boards')
export class BoardsController {
  constructor(
    private readonly boards: BoardsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly compliance: ComplianceService,
  ) {}

  /** Semantic-role vocabulary (spec §10.2) — consumed by the column editor. */
  @Get('semantic-roles')
  semanticRoles() {
    return { roles: SEMANTIC_ROLES };
  }

  /**
   * Cross-board item search over names and column values (§9). Declared above
   * `@Get(':id')` — Nest matches in declaration order, so a later route here
   * would be captured as a board id.
   */
  @Get('search')
  async search(@Headers('x-user-email') email: string | undefined, @Query('q') q?: string) {
    const ctx = await this.identity.resolve(email);
    this.assertItemRead(ctx);
    return this.boards.searchItems(ctx, (q ?? '').trim());
  }

  /* ---------------- engagements + workspaces ---------------- */

  @Post('engagements')
  async createEngagement(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; agencyId?: string; projectId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsManage);
    return this.boards.createEngagement(ctx.orgId, body);
  }

  @Get('engagements')
  async listEngagements(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsRead);
    return this.boards.listEngagements(ctx);
  }

  @Post('workspaces')
  async createWorkspace(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; engagementId?: string; workspaceType?: 'client' | 'internal' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsManage);
    return this.boards.createWorkspace(ctx.orgId, ctx.userId, body);
  }

  @Get('workspaces')
  async listWorkspaces(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsRead);
    return this.boards.listWorkspaces(ctx);
  }

  /* ---------------- boards ---------------- */

  @Post()
  async createBoard(
    @Headers('x-user-email') email: string | undefined,
    @Body()
    body: { workspaceId: string; name: string; description?: string; isTemplate?: boolean; clonedFrom?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsWrite);
    return this.boards.createBoard(ctx, body);
  }

  @Get()
  async listBoards(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsRead);
    return this.boards.listBoards(ctx);
  }

  @Get(':id')
  async boardDetail(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsRead);
    return this.boards.boardDetail(ctx, id);
  }

  /* ---------------- columns ---------------- */

  @Post(':id/columns')
  async addColumn(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') boardId: string,
    @Body() body: { name: string; columnType: string; config?: Record<string, unknown>; semanticRole?: string | null },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsWrite);
    return this.boards.addColumn(ctx, boardId, body);
  }

  /* ---------------- items ---------------- */

  @Post(':id/items')
  async createItem(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') boardId: string,
    @Body() body: { groupId?: string; name: string; columnValues?: Record<string, unknown> },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ItemsWrite);
    return this.boards.createItem(ctx, boardId, body);
  }

  @Get(':id/items')
  async listItems(@Headers('x-user-email') email: string | undefined, @Param('id') boardId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsRead);
    return this.boards.listItems(ctx, boardId);
  }

  /**
   * Scoped item read. A guest reaches exactly its `item_scope` item here; every
   * other item id returns 404, indistinguishable from "does not exist".
   */
  @Get('items/:itemId')
  async getItem(@Headers('x-user-email') email: string | undefined, @Param('itemId') itemId: string) {
    const ctx = await this.identity.resolve(email);
    this.assertItemRead(ctx);
    return this.boards.getItem(ctx, itemId);
  }

  @Patch('items/:itemId')
  async updateItem(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: { name?: string; columnValues?: Record<string, unknown> },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ItemsWrite);
    return this.boards.updateItem(ctx, itemId, body);
  }

  /** Move an item between groups and to a position (§9 kanban DnD). */
  @Post('items/:itemId/move')
  async moveItem(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: { groupId: string; beforeItemId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ItemsWrite);
    return this.boards.moveItem(ctx, itemId, body);
  }

  /* ---------------- views ---------------- */

  @Post(':id/views')
  async addView(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') boardId: string,
    @Body() body: { name: string; viewType: string; config?: Record<string, unknown>; isDefault?: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.BoardsWrite);
    return this.boards.addView(ctx, boardId, body);
  }

  /* ---------------- guest links ---------------- */

  @Post('items/:itemId/guest-links')
  async createGuestLink(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: { email?: string; expiresInDays: number },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.GuestLinksManage);
    return this.boards.createGuestLink(ctx, { itemId, ...body });
  }

  @Get('items/:itemId/guest-links')
  async listGuestLinks(@Headers('x-user-email') email: string | undefined, @Param('itemId') itemId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.GuestLinksManage);
    return this.boards.listGuestLinks(ctx, itemId);
  }

  /* ---------------- compliance checks ---------------- */

  @Get('items/:itemId/compliance')
  async listCompliance(@Headers('x-user-email') email: string | undefined, @Param('itemId') itemId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ComplianceRead);
    return this.compliance.listChecks(ctx, itemId);
  }

  @Post('items/:itemId/compliance/run')
  async runCompliance(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: { files?: Array<{ name: string; metadata?: Record<string, unknown> }> },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AgentsRun);
    return this.compliance.runGuard(ctx, itemId, body.files ?? []);
  }

  @Post('compliance/:checkId/clear')
  async clearCompliance(
    @Headers('x-user-email') email: string | undefined,
    @Param('checkId') checkId: string,
    @Body() body: { reason: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ComplianceClear);
    return this.compliance.clearCheck(ctx, checkId, body.reason);
  }

  /** Guests hold no board capability; their read is the item scope itself. */
  private assertItemRead(ctx: UserContext): void {
    if (ctx.itemScope) return;
    this.authz.require(ctx, Capability.ItemsRead);
  }
}