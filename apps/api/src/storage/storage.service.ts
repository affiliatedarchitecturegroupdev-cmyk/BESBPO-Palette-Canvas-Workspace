import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { Database } from '../db/database';

export interface AssetRow {
  id: string;
  org_id: string;
  key: string;
  content_type: string;
  size_bytes: string;
  sha256: string;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

const DEFAULT_TTL_SEC = 300;

/**
 * P6-10 object storage. Dev backend is local disk under STORAGE_DIR with
 * S3-style semantics: uploads are content-addressed server-side (sha256
 * recorded) and reads go through HMAC-signed, expiring URLs — the signature
 * is the credential, so /assets/file/:id needs no session. The production
 * backend swaps `put`/`read` for S3 while keeping the same signing contract.
 */
@Injectable()
export class StorageService {
  private readonly dir = process.env.STORAGE_DIR ?? join(process.cwd(), '.data', 'storage');
  private readonly secret = process.env.STORAGE_SECRET ?? 'dev-storage-secret';

  constructor(private readonly db: Database) {}

  async put(orgId: string, actorId: string, key: string, bytes: Buffer, contentType: string): Promise<AssetRow> {
    const id = randomUUID();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await mkdir(join(this.dir, orgId), { recursive: true });
    await writeFile(this.pathFor(orgId, id), bytes);
    return this.db.one<AssetRow>(
      `INSERT INTO asset (id, org_id, key, content_type, size_bytes, sha256, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, orgId, key, contentType, bytes.length, sha256, actorId],
    );
  }

  async list(orgId: string): Promise<AssetRow[]> {
    const { rows } = await this.db.query<AssetRow>(
      'SELECT * FROM asset WHERE org_id = $1 ORDER BY created_at DESC LIMIT 200',
      [orgId],
    );
    return rows;
  }

  async get(orgId: string, id: string): Promise<AssetRow | null> {
    return this.db.oneOrNull<AssetRow>('SELECT * FROM asset WHERE id = $1 AND org_id = $2', [id, orgId]);
  }

  async getById(id: string): Promise<AssetRow | null> {
    return this.db.oneOrNull<AssetRow>('SELECT * FROM asset WHERE id = $1', [id]);
  }

  async read(row: AssetRow): Promise<Buffer> {
    return readFile(this.pathFor(row.org_id, row.id));
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
    await this.db.query('UPDATE asset SET metadata = $2 WHERE id = $1', [id, JSON.stringify(metadata)]);
  }

  /** Issue a signed, expiring URL for an asset. */
  signedUrl(id: string, ttlSec = DEFAULT_TTL_SEC): string {
    const expires = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = this.sign(id, expires);
    return `/assets/file/${id}?expires=${expires}&sig=${sig}`;
  }

  /** Verify a signed URL without touching the session. */
  verify(id: string, expires: number, sig: string): boolean {
    if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
    const expected = this.sign(id, expires);
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private sign(id: string, expires: number): string {
    return createHmac('sha256', this.secret).update(`${id}.${expires}`).digest('hex');
  }

  private pathFor(orgId: string, id: string): string {
    return join(this.dir, orgId, id);
  }
}
