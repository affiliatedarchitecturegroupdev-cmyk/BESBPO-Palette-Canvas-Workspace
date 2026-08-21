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
    return {
      userId: person.id,
      orgId: person.org_id,
      roles: bindings.rows.map((b) => b.role as Role),
      scopes: bindings.rows
        .filter((b) => b.scope_type === 'agency' || b.scope_type === 'project')
        .map((b) => ({ workspaceId: b.scope_id, visibility: VisibilityLevel.ClientShared })),
    };
  }
}
