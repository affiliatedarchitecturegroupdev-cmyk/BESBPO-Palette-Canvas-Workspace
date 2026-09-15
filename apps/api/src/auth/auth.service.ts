import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { Role, OrgStatus, PlanTier } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { hashPassword, verifyPassword } from './password';
import {
  RESEND_THROTTLE_MS,
  SESSION_TTL_LONG,
  SESSION_TTL_SHORT,
  hashToken,
  newSessionToken,
  passwordMeetsPolicy,
} from './session';
import { TemplateDefinition } from '../templates/templates.service';

export interface SignupInput {
  slug: string;
  orgName: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthSession {
  token: string;
  ttlMs: number;
}

export interface OrgRow {
  id: string;
  slug: string | null;
  name: string;
  display_name: string | null;
  status: string;
  plan_tier: string;
  owner_person_id: string | null;
  trial_ends_at: Date | null;
}

export interface PersonRow {
  id: string;
  org_id: string;
  email: string;
  name: string;
  password_hash: string | null;
  verified_at: Date | null;
}

const OWNER_ROLE: Role = Role.AgencyAdmin;
const TRIAL_DAYS = 14;

/**
 * AuthN core + sign-up/bootstrap (A-01 §0.1, §1.1–1.2). Self-serve signup
 * creates an organisation with trial defaults, the owning person (agency_admin
 * binding per §1.2), a starter template pack, and a verification outbox row.
 * Login issues an httpOnly session; all credential flows are audited.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async signup(input: SignupInput): Promise<{ org: OrgRow; person: PersonRow }> {
    const email = input.ownerEmail.toLowerCase().trim();
    const slug = await this.uniqueSlug(input.slug.trim().toLowerCase());
    if (!email || !slug) {
      throw new ConflictException('missing or invalid signup fields');
    }
    const existing = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM person WHERE email = $1',
      [email],
    );
    if (existing) {
      throw new ConflictException(`email already registered: ${email}`);
    }

    const passwordHash = await hashPassword(input.password);
    const orgId = randomUUID();
    const personId = randomUUID();
    const trialEnds = new Date(Date.now() + TRIAL_DAYS * 86_400_000);

    const client = await this.db.connect();
    let verifyOutboxId: string | null = null;
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO organisation (id, name, slug, display_name, status, plan_tier, trial_ends_at, default_timezone, default_locale)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [orgId, input.orgName.trim(), slug, input.orgName.trim(), OrgStatus.Trial, PlanTier.Free, trialEnds, 'UTC', 'en-GB'],
      );
      await client.query(
        `INSERT INTO person (id, org_id, email, name, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        [personId, orgId, email, input.ownerName.trim(), passwordHash],
      );
      await client.query('UPDATE organisation SET owner_person_id = $1 WHERE id = $2', [
        personId,
        orgId,
      ]);
      await client.query(
        `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
         VALUES ($1, $2, 'organisation', $3)`,
        [personId, OWNER_ROLE, orgId],
      );
      await this.seedStarterTemplates(client, orgId);
      const verifyToken = randomBytes(24).toString('base64url');
      const enqueued = await this.email.enqueue(
        {
          orgId,
          recipient: email,
          subject: 'Verify your Palette Canvas account',
          body: `Verify: ${verifyToken}`,
          kind: 'signup.verify',
          token: verifyToken,
        },
        client,
      );
      verifyOutboxId = enqueued.id;
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // After commit, and never throwing: a transport failure must not fail a
    // signup that is already durable. The outbox row records the outcome.
    if (verifyOutboxId) await this.email.dispatch(verifyOutboxId);

    await this.audit.log(orgId, personId, 'auth.signed_up', 'organisation', orgId, { email });
    const org = { id: orgId, slug, name: input.orgName.trim(), display_name: input.orgName.trim(), status: OrgStatus.Trial, plan_tier: PlanTier.Free, owner_person_id: personId, trial_ends_at: trialEnds } satisfies OrgRow;
    return { org, person: { id: personId, org_id: orgId, email, name: input.ownerName.trim(), password_hash: passwordHash, verified_at: null } };
  }

  /**
   * Consume a single-use verification outbox token (A-02).
   *
   * Distinguishes three failure modes deliberately:
   *  - unknown token → 401 (nothing to say; do not confirm a token ever existed)
   *  - already consumed → 410 Gone (the token was real; the state is now closed)
   *  - past `expires_at` → 410 Gone (same reasoning, different cause)
   * A plain 401 for a replayed token hides from a legitimate user that their
   * click already worked, which is the common support case.
   */
  async verifyEmail(token: string): Promise<{ orgId: string; personId: string }> {
    const row = await this.consumeToken(token, 'signup.verify');
    const person = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM person WHERE org_id = $1 AND email = $2',
      [row.orgId, row.recipient],
    );
    if (!person) throw new UnauthorizedException('verification target not found');
    await this.db.query('UPDATE person SET verified_at = now() WHERE id = $1 AND verified_at IS NULL', [
      person.id,
    ]);
    await this.db.query('UPDATE email_outbox SET consumed_at = now() WHERE id = $1', [row.id]);
    await this.audit.log(row.orgId, person.id, 'auth.email_verified', 'person', person.id, {});
    return { orgId: row.orgId, personId: person.id };
  }

  /** Shared single-use token consumption for verify + reset (A-02/A-03). */
  private async consumeToken(
    token: string,
    kind: string,
  ): Promise<{ id: string; orgId: string; recipient: string }> {
    if (!token) throw new UnauthorizedException('invalid or expired token');
    const row = await this.db.oneOrNull<{
      id: string;
      org_id: string;
      recipient: string;
      consumed_at: Date | null;
      expires_at: Date | null;
    }>(
      `SELECT id, org_id, recipient, consumed_at, expires_at
         FROM email_outbox WHERE kind = $1 AND token_hash = $2`,
      [kind, hashToken(token)],
    );
    if (!row) throw new UnauthorizedException('invalid or expired token');
    if (row.consumed_at) throw new GoneException('token already used');
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      throw new GoneException('token expired');
    }
    return { id: row.id, orgId: row.org_id, recipient: row.recipient };
  }

  /**
   * Re-issue a verification link (A-02). Throttled per recipient so this
   * cannot be used to flood a mailbox: inside the throttle window the existing
   * pending token is returned instead of a new one being minted, which also
   * avoids invalidating a link the user may already have open.
   */
  async resendVerification(rawEmail: string): Promise<{ sent: boolean; throttled: boolean }> {
    const email = rawEmail.toLowerCase().trim();
    const person = await this.db.oneOrNull<{ id: string; org_id: string; verified_at: Date | null }>(
      'SELECT id, org_id, verified_at FROM person WHERE email = $1',
      [email],
    );
    // Always report success for an unknown address — the endpoint must not
    // become an account-existence oracle.
    if (!person) return { sent: false, throttled: false };
    if (person.verified_at) return { sent: false, throttled: false };

    const pending = await this.db.oneOrNull<{ created_at: Date; token_hash: string | null }>(
      `SELECT created_at, token_hash FROM email_outbox
        WHERE kind = 'signup.verify' AND recipient = $1 AND consumed_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const withinThrottle =
      pending && Date.now() - new Date(pending.created_at).getTime() < RESEND_THROTTLE_MS;
    if (withinThrottle) {
      await this.audit.log(person.org_id, person.id, 'auth.verification_resent', 'person', person.id, {
        throttled: true,
      });
      return { sent: false, throttled: true };
    }

    const token = randomBytes(24).toString('base64url');
    const enqueued = await this.email.enqueue({
      orgId: person.org_id,
      recipient: email,
      subject: 'Verify your Palette Canvas account',
      body: `Verify: ${token}`,
      kind: 'signup.verify',
      token,
    });
    const delivered = await this.email.dispatch(enqueued.id);
    await this.audit.log(person.org_id, person.id, 'auth.verification_resent', 'person', person.id, {
      delivered,
    });
    return { sent: delivered, throttled: false };
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const email = input.email.toLowerCase().trim();
    const person = await this.db.oneOrNull<PersonRow & { status: string }>(
      `SELECT p.*, o.status FROM person p JOIN organisation o ON o.id = p.org_id WHERE p.email = $1`,
      [email],
    );
    if (!person || !person.password_hash) {
      throw new UnauthorizedException('invalid credentials');
    }
    if (person.status === OrgStatus.Suspended) {
      throw new UnauthorizedException('account suspended');
    }
    const ok = await verifyPassword(person.password_hash, input.password);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    // 403, not 401: the credentials were correct, so this is not a failed
    // authentication — it is a correct authentication against an account that
    // is not yet usable. Distinguishing them lets the client offer "resend
    // verification" instead of "check your password".
    if (!person.verified_at) {
      throw new ForbiddenException('email not verified');
    }
    const ttlMs = input.remember ? SESSION_TTL_LONG : SESSION_TTL_SHORT;
    const token = newSessionToken();
    await this.db.query(
      `INSERT INTO session (id, org_id, person_id, token_hash, status, expires_at, remember)
       VALUES ($1, $2, $3, $4, 'active', now() + ($5 * interval '1 ms'), $6)`,
      [randomUUID(), person.org_id, person.id, hashToken(token), ttlMs, !!input.remember],
    );
    await this.audit.log(person.org_id, person.id, 'auth.logged_in', 'session', person.id, {});
    return { token, ttlMs };
  }

  /**
   * Revoke every active session for a person, optionally sparing one token
   * (A-03). Used on password change/reset so a stolen session cannot outlive
   * the credential it was obtained with. Sparing the current token keeps the
   * user who just changed their own password logged in.
   */
  async revokeSessions(personId: string, exceptToken?: string): Promise<number> {
    const exceptional = exceptToken ? hashToken(exceptToken) : null;
    const { rows } = await this.db.query<{ id: string; org_id: string }>(
      `UPDATE session SET status = 'revoked', revoked_at = now()
        WHERE person_id = $1 AND status = 'active'
          AND ($2::text IS NULL OR token_hash <> $2)
        RETURNING id, org_id`,
      [personId, exceptional],
    );
    for (const row of rows) {
      await this.audit.log(row.org_id, personId, 'auth.session_revoked', 'session', row.id, {
        reason: 'password_change',
      });
    }
    return rows.length;
  }

  /**
   * Start a password reset (A-03). Always reports success so the endpoint is
   * not an account-existence oracle, and always writes an audit row so a real
   * reset attempt is traceable even when the address is unknown.
   */
  async requestPasswordReset(rawEmail: string): Promise<{ sent: boolean }> {
    const email = rawEmail.toLowerCase().trim();
    const person = await this.db.oneOrNull<{ id: string; org_id: string }>(
      'SELECT id, org_id FROM person WHERE email = $1',
      [email],
    );
    if (!person) return { sent: false };

    const token = randomBytes(24).toString('base64url');
    const enqueued = await this.email.enqueue({
      orgId: person.org_id,
      recipient: email,
      subject: 'Reset your Palette Canvas password',
      body: `Reset: ${token}`,
      kind: 'password.reset',
      token,
    });
    const delivered = await this.email.dispatch(enqueued.id);
    await this.audit.log(person.org_id, person.id, 'auth.password_reset_requested', 'person', person.id, {
      delivered,
    });
    return { sent: delivered };
  }

  /**
   * Complete a password reset (A-03). Consumes the token, rehashes, and revokes
   * every existing session — a reset is the signal that the old credential is
   * no longer trusted, so no session issued under it may survive.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ personId: string }> {
    if (!passwordMeetsPolicy(newPassword)) {
      throw new BadRequestException('password must be at least 8 characters');
    }
    const row = await this.consumeToken(token, 'password.reset');
    const person = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM person WHERE org_id = $1 AND email = $2',
      [row.orgId, row.recipient],
    );
    if (!person) throw new UnauthorizedException('reset target not found');
    const passwordHash = await hashPassword(newPassword);
    await this.db.query(
      'UPDATE person SET password_hash = $2, password_changed_at = now() WHERE id = $1',
      [person.id, passwordHash],
    );
    await this.db.query('UPDATE email_outbox SET consumed_at = now() WHERE id = $1', [row.id]);
    const revoked = await this.revokeSessions(person.id);
    await this.audit.log(row.orgId, person.id, 'auth.password_reset', 'person', person.id, {
      sessionsRevoked: revoked,
    });
    return { personId: person.id };
  }

  /**
   * Change a password from a live session (A-03). Requires the current password
   * so a hijacked session cannot escalate to full account takeover, and revokes
   * other sessions while keeping the caller's own.
   */
  async changePassword(
    currentToken: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ personId: string; sessionsRevoked: number }> {
    if (!passwordMeetsPolicy(newPassword)) {
      throw new BadRequestException('password must be at least 8 characters');
    }
    const resolved = await this.resolveSession(currentToken);
    if (!resolved) throw new UnauthorizedException('not authenticated');
    if (!resolved.person.password_hash) throw new UnauthorizedException('no password set');
    const ok = await verifyPassword(resolved.person.password_hash, currentPassword);
    if (!ok) throw new UnauthorizedException('current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    await this.db.query(
      'UPDATE person SET password_hash = $2, password_changed_at = now() WHERE id = $1',
      [resolved.person.id, passwordHash],
    );
    const sessionsRevoked = await this.revokeSessions(resolved.person.id, currentToken);
    await this.audit.log(
      resolved.org.id,
      resolved.person.id,
      'auth.password_changed',
      'person',
      resolved.person.id,
      { sessionsRevoked },
    );
    return { personId: resolved.person.id, sessionsRevoked };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const row = await this.db.oneOrNull<{ id: string; org_id: string; person_id: string; status: string }>(
      'SELECT id, org_id, person_id, status FROM session WHERE token_hash = $1',
      [hashToken(token)],
    );
    if (row && row.status === 'active') {
      await this.db.query('UPDATE session SET status = $1, revoked_at = now() WHERE id = $2', ['revoked', row.id]);
      await this.audit.log(row.org_id, row.person_id, 'auth.logged_out', 'session', row.id, {});
    }
  }

  /** Resolve the person + roles for an active session token (null when invalid/expired). */
  async resolveSession(token: string | undefined): Promise<{ person: PersonRow; org: OrgRow; roles: Role[] } | null> {
    if (!token) return null;
    const row = await this.db.oneOrNull<{ person_id: string; org_id: string; status: string; expires_at: Date }>(
      `SELECT person_id, org_id, status, expires_at FROM session WHERE token_hash = $1`,
      [hashToken(token)],
    );
    if (!row || row.status !== 'active') return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    const person = await this.db.oneOrNull<PersonRow>('SELECT * FROM person WHERE id = $1', [row.person_id]);
    if (!person) return null;
    const org = await this.db.oneOrNull<OrgRow>('SELECT * FROM organisation WHERE id = $1', [row.org_id]);
    if (!org) return null;
    const { rows } = await this.db.query<{ role: string }>(
      'SELECT role FROM role_binding WHERE person_id = $1',
      [person.id],
    );
    return { person, org, roles: rows.map((r) => r.role as Role) };
  }

  private async uniqueSlug(base: string): Promise<string | null> {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(base)) return null;
    const existing = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM organisation WHERE slug = $1',
      [base],
    );
    if (existing) throw new ConflictException(`slug already taken: ${base}`);
    return base;
  }

  private async seedStarterTemplates(client: PoolClient, orgId: string): Promise<void> {
    const starter: Array<{ key: string; name: string; definition: TemplateDefinition }> = [
      {
        key: 'brand_identity',
        name: 'Brand Identity Redesign',
        definition: {
          phases: ['planning', 'production', 'internal_qa', 'proofing', 'handover'],
          requiredBriefFields: [
            { name: 'brand_values', label: 'Brand values', type: 'textarea' },
            { name: 'deliverable_list', label: 'Expected deliverables', type: 'textarea' },
          ],
          deliverables: ['Logo suite', 'Brand guidelines', 'Asset starter kit'],
          qualityChecks: ['Technical validation', 'Brand checklist'],
          slaTargets: { triageHours: 24 },
          approvalSteps: ['Internal QA', 'Client approval'],
          handoverRequirements: ['Deliverable manifest', 'Licence notes', 'Acceptance sign-off'],
        },
      },
      {
        key: 'social_retainer',
        name: 'Social Content Retainer',
        definition: {
          phases: ['planning', 'production', 'proofing', 'handover'],
          requiredBriefFields: [
            { name: 'monthly_volume', label: 'Monthly content volume', type: 'text' },
            { name: 'channels', label: 'Channels', type: 'text' },
          ],
          deliverables: ['Monthly content batch'],
          qualityChecks: ['Copy/presentation check'],
          slaTargets: { triageHours: 8 },
          approvalSteps: ['Client approval'],
          handoverRequirements: ['Month-end package', 'Schedule update'],
        },
      },
    ];
    for (const t of starter) {
      await client.query(
        `INSERT INTO service_template (id, org_id, key, name, version, definition)
         VALUES ($1, $2, $3, $4, 1, $5)
         ON CONFLICT (org_id, key, version) DO NOTHING`,
        [randomUUID(), orgId, t.key, t.name, JSON.stringify(t.definition)],
      );
    }
  }
}