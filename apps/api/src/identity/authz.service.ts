import { ForbiddenException, Injectable } from '@nestjs/common';
import { Capability, Role, UserContext, can } from '@palette-canvas/shared';
import { Database } from '../db/database';

/** Roles allowed to read org-level data across agency boundaries. */
const ORG_WIDE: readonly Role[] = [
  Role.PlatformOwner,
  Role.OperationsDirector,
  Role.AccountManager,
  Role.ProductionLead,
  Role.QualityReviewer,
  Role.CreativeContributor,
  Role.FinanceUser,
];

interface OverrideRow {
  role: string;
  capability: string;
  effect: 'grant' | 'revoke';
}

const OVERRIDE_TTL_MS = 5000;

/**
 * Server-side policy layer. Capability checks and agency-scope predicates all
 * run through here so controllers and modules share one enforcement path.
 *
 * `require` consults the static role map (sync). `requireEffective` also
 * applies org-scoped overrides created by approved permission reviews (B-02);
 * overrides are cached per org with a short TTL and invalidated on decide.
 */
@Injectable()
export class AuthzService {
  private readonly overrides = new Map<string, { at: number; rows: OverrideRow[] }>();

  constructor(private readonly db: Database) {}

  require(ctx: UserContext, capability: Capability): void {
    if (!can(ctx.roles, capability)) {
      throw new ForbiddenException(`missing ${capability}`);
    }
  }

  async requireEffective(ctx: UserContext, capability: Capability): Promise<void> {
    const rows = await this.overridesFor(ctx.orgId);
    for (const o of rows) {
      if (o.capability === capability && ctx.roles.includes(o.role as Role)) {
        if (o.effect === 'grant') return;
        if (o.effect === 'revoke') throw new ForbiddenException(`missing ${capability} (revoked by org override)`);
      }
    }
    this.require(ctx, capability);
  }

  invalidateOverrides(orgId: string): void {
    this.overrides.delete(orgId);
  }

  private async overridesFor(orgId: string): Promise<OverrideRow[]> {
    const cached = this.overrides.get(orgId);
    if (cached && Date.now() - cached.at < OVERRIDE_TTL_MS) return cached.rows;
    const { rows } = await this.db.query<OverrideRow>(
      'SELECT role, capability, effect FROM role_capability_override WHERE org_id = $1',
      [orgId],
    );
    this.overrides.set(orgId, { at: Date.now(), rows });
    return rows;
  }

  /** True when the actor may see a record belonging to `agencyId`. */
  canAccessAgency(ctx: UserContext, agencyId: string): boolean {
    if (ctx.roles.some((r) => ORG_WIDE.includes(r))) return true;
    return ctx.scopes.some((s) => s.workspaceId === agencyId);
  }

  /** Filter predicate usable on a list of agency-scoped rows. */
  agencyFilter(ctx: UserContext): string[] | null {
    if (ctx.roles.some((r) => ORG_WIDE.includes(r))) return null; // no filter
    return ctx.scopes.map((s) => s.workspaceId);
  }
}
