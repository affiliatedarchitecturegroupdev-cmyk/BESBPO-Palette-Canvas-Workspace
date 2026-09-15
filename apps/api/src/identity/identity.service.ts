import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role, UserContext, VisibilityLevel } from '@palette-canvas/shared';
import { Database } from '../db/database';

export interface RoleBindingRow {
  role: string;
  scope_type: string;
  scope_id: string;
}

/**
 * Dev-auth resolution. The request carries `x-user-email`; role bindings are
 * loaded from the database so scoped access decisions come from the same
 * record source as the permission matrix. SSO/MFA replaces this transport in
 * Phase 5 hardening (see ADR-0002).
 */
@Injectable()
export class IdentityService {
  constructor(private readonly db: Database) {}

  async resolve(email: string | undefined): Promise<UserContext> {
    if (!email) throw new UnauthorizedException('missing x-user-email header');
    const person = await this.db.oneOrNull<{ id: string; org_id: string }>(
      'SELECT id, org_id FROM person WHERE email = $1',
      [email.toLowerCase()],
    );
    if (!person) throw new UnauthorizedException(`unknown user ${email}`);
    const bindings = await this.db.query<RoleBindingRow>(
      'SELECT role, scope_type, scope_id FROM role_binding WHERE person_id = $1',
      [person.id],
    );
    const roles = bindings.rows.map((b) => b.role as Role);

    // V2 §14.1 — an engagement-scoped binding narrows every downstream query.
    // Agency/project scopes resolve through their engagement (if one exists) so
    // the new boundary and the legacy one agree.
    const engagementBinding = bindings.rows.find((b) => b.scope_type === 'engagement');
    let engagementId = engagementBinding?.scope_id ?? null;
    if (!engagementId) {
      const scoped = bindings.rows.find((b) => b.scope_type === 'agency' || b.scope_type === 'project');
      if (scoped) {
        const row = await this.db.oneOrNull<{ id: string }>(
          scoped.scope_type === 'agency'
            ? 'SELECT id FROM engagement WHERE agency_id = $1 ORDER BY created_at LIMIT 1'
            : 'SELECT id FROM engagement WHERE project_id = $1 ORDER BY created_at LIMIT 1',
          [scoped.scope_id],
        );
        engagementId = row?.id ?? null;
      }
    }

    // A guest binding is time-boxed and item-scoped; both are mandatory, so an
    // expired or unscoped guest resolves to no access at all.
    const isGuest = roles.includes(Role.Guest);
    let itemScope: string | null = null;
    let expiresAt: string | null = null;
    if (isGuest) {
      const guestRow = await this.db.oneOrNull<{ item_scope: string | null; expires_at: string | null }>(
        `SELECT g.item_id AS item_scope, g.expires_at::text AS expires_at
         FROM guest_link g JOIN person p ON p.email = g.email
         WHERE p.id = $1 AND g.revoked_at IS NULL AND g.expires_at > now()
         ORDER BY g.created_at DESC LIMIT 1`,
        [person.id],
      );
      if (!guestRow?.item_scope) {
        throw new UnauthorizedException('guest link expired or unavailable');
      }
      itemScope = `item:${guestRow.item_scope}`;
      expiresAt = guestRow.expires_at;
    }

    return {
      userId: person.id,
      orgId: person.org_id,
      roles,
      scopes: bindings.rows
        .filter((b) => b.scope_type === 'agency' || b.scope_type === 'project')
        .map((b) => ({ workspaceId: b.scope_id, visibility: VisibilityLevel.ClientShared })),
      itemScope,
      expiresAt,
      engagementId,
    };
  }
}
