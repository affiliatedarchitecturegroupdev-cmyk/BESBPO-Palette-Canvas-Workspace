import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  scope_type: string;
  scope_id: string;
  token: string;
  status: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  accepted_person_id: string | null;
}

/**
 * P8-01 org-scoped invitations. An invited person accepts with a unique
 * token; acceptance provisions a person row (if needed) plus the role_binding
 * named on the invite, marks the invite accepted,and revokes are audited.
 */
@Injectable()
export class InvitesService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string, includeAll = false): Promise<InviteRow[]> {
    const { rows } = await this.db.query<InviteRow>(
      `SELECT id, email, role, scope_type, scope_id, token, status, invited_by,
              expires_at, created_at, accepted_at, accepted_person_id
       FROM invite WHERE org_id = $1 ${includeAll ? '' : "AND status = 'pending'"} ORDER BY created_at DESC`,
      [orgId],
    );
    return rows;
  }

  async create(
    orgId: string,
    invitedBy: string,
    input: { email: string; role: string; scopeType: string; scopeId: string },
  ): Promise<InviteRow> {
    const existing = await this.db.oneOrNull<{ id: string; status: string }>(
      'SELECT id, status FROM invite WHERE org_id = $1 AND email = $2 AND status = $3',
      [orgId, input.email.toLowerCase(), 'pending'],
    );
    if (existing) {
      throw new ConflictException('an active invite already exists for that email');
    }
    const row = await this.db.one<InviteRow>(
      `INSERT INTO invite (id, org_id, email, role, scope_type, scope_id, token, invited_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, email, role, scope_type, scope_id, token, status, invited_by,
                 expires_at, created_at, accepted_at, accepted_person_id`,
      [randomUUID(), orgId, input.email.toLowerCase(), input.role, input.scopeType, input.scopeId, randomBytes(24).toString('hex'), invitedBy] as never[],
    );
    await this.audit.log(orgId, invitedBy, 'invite.created', 'invite', row.id, {
      email: row.email,
      role: row.role,
      scope: `${row.scope_type}:${row.scope_id}`,
    });
    return row;
  }

  /** Accept with a token; provisions person + role binding and flips status. */
  async accept(token: string, email: string, name: string): Promise<{ personId: string; invite: InviteRow }> {
    const found = await this.db.oneOrNull<{ orgId: string }>(
      'SELECT org_id AS "orgId" FROM invite WHERE token = $1',
      [token],
    );
    if (!found) throw new NotFoundException('invite not found or invalid');
    const orgId = found.orgId;
    const invite = await this.db.oneOrNull<InviteRow>(
      `SELECT id, email, role, scope_type, scope_id, token, status, invited_by,
              expires_at, created_at, accepted_at, accepted_person_id
       FROM invite WHERE org_id = $1 AND token = $2`,
      [orgId, token],
    );
    if (!invite) throw new NotFoundException('invite not found or invalid');
    if (invite.status !== 'pending') throw new ConflictException('invite is not pending');
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new ConflictException('invite has expired');
    }
    const emailLower = email.toLowerCase();
    let person = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM person WHERE org_id = $1 AND email = $2',
      [orgId, emailLower],
    );
    let personId: string;
    if (person) {
      personId = person.id;
    } else {
      personId = randomUUID();
      await this.db.query(
        'INSERT INTO person (id, org_id, email, name) VALUES ($1,$2,$3,$4)',
        [personId, orgId, emailLower, name || emailLower] as never[],
      );
    }
    await this.db.query(
      `INSERT INTO role_binding (person_id, role, scope_type, scope_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [personId, invite.role, invite.scope_type, invite.scope_id],
    );
    const updated = await this.db.one<InviteRow>(
      `UPDATE invite SET status = 'accepted', accepted_at = now(), accepted_person_id = $3
       WHERE org_id = $1 AND id = $2 RETURNING id, email, role, scope_type, scope_id, token,
                 status, invited_by, expires_at, created_at, accepted_at, accepted_person_id`,
      [orgId, invite.id, personId],
    );
    await this.audit.log(orgId, personId, 'invite.accepted', 'invite', invite.id, {
      email: emailLower,
    });
    return { personId, invite: updated };
  }

  async revoke(orgId: string, actorId: string, id: string): Promise<InviteRow> {
    const row = await this.db.oneOrNull<InviteRow>(
      `UPDATE invite SET status = 'revoked' WHERE org_id = $1 AND id = $2 AND status = 'pending'
       RETURNING id, email, role, scope_type, scope_id, token, status, invited_by,
                 expires_at, created_at, accepted_at, accepted_person_id`,
      [orgId, id],
    );
    if (!row) throw new NotFoundException('active invite not found');
    await this.audit.log(orgId, actorId, 'invite.revoked', 'invite', row.id, { email: row.email });
    return row;
  }
}