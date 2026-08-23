import { ForbiddenException, Injectable } from '@nestjs/common';
import { Capability, Role, UserContext, can } from '@palette-canvas/shared';

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

/**
 * Server-side policy layer. Capability checks and agency-scope predicates all
 * run through here so controllers and modules share one enforcement path.
 */
@Injectable()
export class AuthzService {
  require(ctx: UserContext, capability: Capability): void {
    if (!can(ctx.roles, capability)) {
      throw new ForbiddenException(`missing ${capability}`);
    }
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
