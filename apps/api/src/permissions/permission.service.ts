import { Injectable } from '@nestjs/common';
import {
  VisibilityLevel,
  Role,
  UserContext,
  canSeeVisibility,
} from '@palette-canvas/shared';

/**
 * Foundation for permission/tenancy checks. In Phase 1 this is in-memory;
 * later phases replace with Postgres-organisation model from the document.
 */
@Injectable()
export class PermissionService {
  canSee(ctx: UserContext, visibility: VisibilityLevel): boolean {
    return canSeeVisibility(ctx, visibility);
  }

  /**
   * Demo: build a UserContext for a role and report visible levels.
   * Useful for the workspace shell until identity/auth is wired in Phase 2.
   */
  scopesFor(roles: Role[]): { workspaceId: string; visibility: VisibilityLevel }[] {
    return [
      {
        workspaceId: 'demo',
        visibility: VisibilityLevel.Internal,
      },
    ];
  }

  assess(ctx: UserContext): { visible: VisibilityLevel[] } {
    const levels = Object.values(VisibilityLevel);
    return { visible: levels.filter((l) => this.canSee(ctx, l)) };
  }
}
