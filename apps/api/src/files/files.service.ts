import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileSource, UserContext } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface FileRow {
  id: string;
  org_id: string;
  engagement_id: string | null;
  name: string;
  content_type: string;
  size_bytes: string;
  storage_key: string;
  source: string;
  external_ref: string | null;
  parent_file_id: string | null;
  version_number: number;
  metadata: Record<string, unknown>;
}

/**
 * Files/DAM (spec §13). One table drives every upload surface: the files-type
 * board column, message attachments and item comments. `parent_file_id` gives
 * the version chain, and `external_ref` lets an Adobe/Canva/Dropbox round-trip
 * find its way back to the same logical file (§13.3).
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async upload(
    ctx: UserContext,
    input: {
      name: string;
      content?: string;
      contentType?: string;
      source?: string;
      externalRef?: string | null;
      engagementId?: string | null;
      metadata?: Record<string, unknown>;
      supersedes?: string | null;
    },
  ): Promise<FileRow> {
    const source = input.source ?? FileSource.NativeUpload;
    if (!Object.values(FileSource).includes(source as FileSource)) {
      throw new BadRequestException(`unknown file source ${source}`);
    }

    let version = 1;
    let parentId: string | null = null;
    let engagementId = input.engagementId ?? ctx.engagementId ?? null;

    // Re-uploading over a previous version extends the chain rather than
    // replacing the row — history stays inspectable (§13.1).
    if (input.supersedes) {
      const prev = await this.db.oneOrNull<FileRow>(
        'SELECT * FROM file_object WHERE id = $1 AND org_id = $2',
        [input.supersedes, ctx.orgId],
      );
      if (!prev) throw new NotFoundException('superseded file not found');
      parentId = prev.parent_file_id ?? prev.id;
      version = prev.version_number + 1;
      engagementId = prev.engagement_id;
    }

    const body = input.content ?? '';
    const file = await this.db.one<FileRow>(
      `INSERT INTO file_object
         (id, org_id, engagement_id, name, content_type, size_bytes, storage_key, source,
          external_ref, parent_file_id, version_number, metadata, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        engagementId,
        input.name,
        input.contentType ?? 'application/octet-stream',
        Buffer.byteLength(body, 'utf8'),
        `org/${ctx.orgId}/files/${randomUUID()}`,
        source,
        input.externalRef ?? null,
        parentId,
        version,
        JSON.stringify(input.metadata ?? {}),
        ctx.userId,
      ],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'file.uploaded', 'file', file.id, {
      source,
      version,
    });
    return file;
  }

  async list(ctx: UserContext, engagementId?: string): Promise<FileRow[]> {
    if (ctx.itemScope) throw new ForbiddenException('guest cannot list files');
    const scope = engagementId ?? ctx.engagementId ?? null;
    const divisionWide = ctx.roles.some((r) => ['operations_director', 'platform_owner'].includes(r as string));
    if (divisionWide && !engagementId) {
      const { rows } = await this.db.query<FileRow>(
        'SELECT * FROM file_object WHERE org_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC',
        [ctx.orgId],
      );
      return rows;
    }
    const { rows } = await this.db.query<FileRow>(
      `SELECT * FROM file_object WHERE org_id = $1 AND deleted_at IS NULL
         AND (engagement_id IS NULL OR engagement_id = $2) ORDER BY created_at DESC`,
      [ctx.orgId, scope ?? '__none__'],
    );
    return rows;
  }

  /** Full version chain for a logical file, oldest first. */
  async versions(ctx: UserContext, fileId: string): Promise<FileRow[]> {
    const file = await this.get(ctx, fileId);
    const rootId = file.parent_file_id ?? file.id;
    const { rows } = await this.db.query<FileRow>(
      `SELECT * FROM file_object WHERE org_id = $1 AND (id = $2 OR parent_file_id = $2)
       ORDER BY version_number`,
      [ctx.orgId, rootId],
    );
    return rows;
  }

  async get(ctx: UserContext, fileId: string): Promise<FileRow> {
    const file = await this.db.oneOrNull<FileRow>(
      'SELECT * FROM file_object WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [fileId, ctx.orgId],
    );
    if (!file) throw new NotFoundException('file not found');
    if (ctx.itemScope) throw new ForbiddenException('guest cannot read files');
    return file;
  }

  async attachToItem(ctx: UserContext, itemId: string, fileId: string, columnId?: string) {
    const [file, item] = await Promise.all([
      this.get(ctx, fileId),
      this.db.oneOrNull<{ id: string }>('SELECT id FROM item WHERE id = $1 AND org_id = $2', [itemId, ctx.orgId]),
    ]);
    if (!item) throw new NotFoundException('item not found');
    await this.db.query(
      `INSERT INTO item_file (item_id, file_id, column_id) VALUES ($1,$2,$3)
       ON CONFLICT (item_id, file_id) DO UPDATE SET column_id = EXCLUDED.column_id`,
      [itemId, file.id, columnId ?? null],
    );
    return { itemId, fileId: file.id, columnId: columnId ?? null };
  }

  async itemFiles(itemId: string): Promise<FileRow[]> {
    const { rows } = await this.db.query<FileRow>(
      `SELECT f.* FROM file_object f
       JOIN item_file i ON i.file_id = f.id
       WHERE i.item_id = $1 AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`,
      [itemId],
    );
    return rows;
  }
}