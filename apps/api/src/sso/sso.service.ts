import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface SsoConfigRow {
  id: string;
  issuer: string;
  client_id: string;
  mfa_required: boolean;
  created_at: string;
}

/**
 * P6-06 SSO/SCIM scaffolding. The OIDC authorization-code dance and full SCIM
 * 2.0 schema handling are out of scope for V1; this module persists the
 * provider config and provides a token-guarded SCIM user upsert so an IdP can
 * provision people into the directory.
 */
@Injectable()
export class SsoService {
  constructor(private readonly db: Database) {}

  async list(orgId: string): Promise<SsoConfigRow[]> {
    const { rows } = await this.db.query<SsoConfigRow>(
      'SELECT id, issuer, client_id, mfa_required, created_at FROM sso_config WHERE org_id = $1 ORDER BY created_at',
      [orgId],
    );
    return rows;
  }

  async upsert(orgId: string, actorId: string, issuer: string, clientId: string, mfaRequired: boolean) {
    return this.db.one(
      `INSERT INTO sso_config (id, org_id, issuer, client_id, mfa_required, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (org_id, issuer) DO UPDATE SET client_id = EXCLUDED.client_id, mfa_required = EXCLUDED.mfa_required
       RETURNING id, issuer, client_id, mfa_required`,
      [randomUUID(), orgId, issuer, clientId, mfaRequired, actorId] as never[],
    );
  }

  /** Validate a SCIM bearer token for the org; throws if it doesn't match. */
  private async requireScimToken(orgId: string, token: string | undefined): Promise<void> {
    const { rows } = await this.db.query<{ scim_token: string | null }>(
      'SELECT scim_token FROM sso_config WHERE org_id = $1 AND scim_token IS NOT NULL',
      [orgId],
    );
    if (!token || !rows.some((r) => r.scim_token === token)) {
      throw new UnauthorizedException('invalid SCIM token');
    }
  }

  /** SCIM-style user upsert: provision (or deactivate) a person by email. */
  async scimUpsertUser(
    orgId: string,
    token: string | undefined,
    body: { externalId: string; email: string; name: string; active?: boolean },
  ) {
    await this.requireScimToken(orgId, token);
    const existing = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM person WHERE org_id = $1 AND email = $2',
      [orgId, body.email.toLowerCase()],
    );
    let personId: string;
    if (existing) {
      personId = existing.id;
    } else {
      personId = randomUUID();
      await this.db.query('INSERT INTO person (id, org_id, email, name) VALUES ($1,$2,$3,$4)', [
        personId, orgId, body.email.toLowerCase(), body.name,
      ] as never[]);
    }
    await this.db.query(
      `INSERT INTO scim_identity (id, org_id, person_id, external_id, active, synced_at)
       VALUES ($1,$2,$3,$4,$5, now())
       ON CONFLICT (org_id, external_id) DO UPDATE SET person_id = EXCLUDED.person_id, active = EXCLUDED.active, synced_at = now()`,
      [randomUUID(), orgId, personId, body.externalId, body.active ?? true] as never[],
    );
    return { personId, externalId: body.externalId, active: body.active ?? true };
  }

  async scimIdentities(orgId: string) {
    const { rows } = await this.db.query(
      `SELECT si.external_id, si.active, si.synced_at, p.email, p.name
       FROM scim_identity si JOIN person p ON p.id = si.person_id
       WHERE si.org_id = $1 ORDER BY si.synced_at DESC`,
      [orgId],
    );
    return rows;
  }
}
