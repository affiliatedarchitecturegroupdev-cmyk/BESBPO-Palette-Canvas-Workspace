import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ApiKeyRow {
  id: string;
  org_id: string;
  person_id: string;
  name: string;
  prefix: string;
  hash: string;
  created_at: string;
  revoked_at: string | null;
}

/** P7-04 org API keys. Tokens are shown once; only the sha256 hash is stored. */
@Injectable()
export class ApiKeysService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async create(orgId: string, personId: string, name: string) {
    const token = `pck_${randomBytes(24).toString('hex')}`;
    const row = await this.db.one<ApiKeyRow>(
      `INSERT INTO api_key (id, org_id, person_id, name, prefix, hash)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), orgId, personId, name, token.slice(0, 12), this.digest(token)],
    );
    await this.audit.log(orgId, personId, 'api_key.created', 'api_key', row.id, { name });
    return { ...this.publicView(row), token };
  }

  async list(orgId: string) {
    const { rows } = await this.db.query<ApiKeyRow>(
      'SELECT * FROM api_key WHERE org_id = $1 ORDER BY created_at DESC',
      [orgId],
    );
    return rows.map((r) => this.publicView(r));
  }

  async revoke(orgId: string, id: string, actorId: string) {
    const row = await this.db.oneOrNull<ApiKeyRow>(
      'UPDATE api_key SET revoked_at = now() WHERE id = $1 AND org_id = $2 AND revoked_at IS NULL RETURNING *',
      [id, orgId],
    );
    if (!row) throw new NotFoundException('api key not found');
    await this.audit.log(orgId, actorId, 'api_key.revoked', 'api_key', id, {});
    return this.publicView(row);
  }

  /** Resolve a presented token to its person (for the auth middleware). */
  async personForToken(token: string): Promise<{ email: string } | null> {
    const row = await this.db.oneOrNull<{ email: string }>(
      `SELECT p.email FROM api_key k JOIN person p ON p.id = k.person_id
       WHERE k.hash = $1 AND k.revoked_at IS NULL`,
      [this.digest(token)],
    );
    return row;
  }

  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private publicView(row: ApiKeyRow) {
    const { hash: _hash, ...rest } = row;
    return rest;
  }
}
