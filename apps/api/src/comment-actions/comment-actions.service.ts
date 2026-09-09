import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ReactionRow {
  id: string;
  comment_id: string;
  person_id: string;
  emoji: string;
}

export interface CommentAssetRow {
  comment_id: string;
  asset_id: string;
}

@Injectable()
export class CommentActionsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async reactions(orgId: string, commentId: string): Promise<Array<{ emoji: string; count: number; people: string[] }>> {
    const { rows } = await this.db.query<{ emoji: string; count: string; people: string[] }>(
      `SELECT r.emoji, COUNT(*)::text AS count, ARRAY_AGG(r.person_id) AS people
       FROM reaction r JOIN person p ON p.id = r.person_id
       WHERE r.org_id = $1 AND r.comment_id = $2
       GROUP BY r.emoji ORDER BY r.emoji`,
      [orgId, commentId],
    );
    return rows.map((r) => ({ emoji: r.emoji, count: Number(r.count), people: r.people }));
  }

  async addReaction(orgId: string, personId: string, commentId: string, emoji: string): Promise<ReactionRow> {
    if (!emoji || emoji.length > 8) throw new BadRequestException('emoji must be 1-8 chars');
    const row = await this.db.oneOrNull<ReactionRow>(
      `INSERT INTO reaction (id, org_id, comment_id, person_id, emoji)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (comment_id, person_id, emoji) DO NOTHING
       RETURNING id, comment_id, person_id, emoji`,
      [randomUUID(), orgId, commentId, personId, emoji] as never[],
    );
    if (row) return row;
    return this.db.one<ReactionRow>(
      `SELECT id, comment_id, person_id, emoji FROM reaction WHERE comment_id = $1 AND person_id = $2 AND emoji = $3`,
      [commentId, personId, emoji],
    );
  }

  async removeReaction(orgId: string, commentId: string, personId: string, emoji: string): Promise<{ removed: boolean }> {
    const res = await this.db.query<{ id: string }>(
      'DELETE FROM reaction WHERE org_id = $1 AND comment_id = $2 AND person_id = $3 AND emoji = $4 RETURNING id',
      [orgId, commentId, personId, emoji],
    );
    return { removed: res.rows.length > 0 };
}

  async assets(orgId: string, commentId: string): Promise<CommentAssetRow[]> {
    const { rows } = await this.db.query<CommentAssetRow>(
      `SELECT ca.comment_id, ca.asset_id
       FROM comment_asset ca JOIN asset a ON a.id = ca.asset_id
       WHERE ca.comment_id = $1 AND a.org_id = $2`,
      [commentId, orgId],
    );
    return rows;
}

  async attachAsset(orgId: string, actorId: string, commentId: string, assetId: string): Promise<CommentAssetRow> {
    const asset = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM asset WHERE id = $1 AND org_id = $2',
      [assetId, orgId],
    );
    if (!asset) throw new NotFoundException('asset not found');
    await this.db.query(
      'INSERT INTO comment_asset (comment_id, asset_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [commentId, assetId],
    );
    await this.audit.log(orgId, actorId, 'comment.asset_attached', 'comment', commentId, { assetId });
    return { comment_id: commentId, asset_id: assetId };
}

  async detachAsset(orgId: string, actorId: string, commentId: string, assetId: string): Promise<{ removed: boolean }> {
    const res2 = await this.db.query<{ comment_id: string; asset_id: string }>(
      'DELETE FROM comment_asset WHERE comment_id = $1 AND asset_id = $2 RETURNING comment_id, asset_id',
      [commentId, assetId],
    );
    if (res2.rows.length) {
      await this.audit.log(orgId, actorId, 'comment.asset_detached', 'comment', commentId, { assetId });
    }
    return { removed: res2.rows.length > 0 };
}

  async toTask(
    orgId: string,
    actorId: string,
    commentId: string,
    projectId: string,
  ): Promise<{ taskId: string }> {
    const comment = await this.db.oneOrNull<{ body: string; target_type: string }>(
      'SELECT body, target_type FROM comment WHERE org_id = $1 AND id = $2',
      [orgId, commentId],
    );
    if (!comment) throw new NotFoundException('comment not found');
    if (comment.target_type === 'task') throw new BadRequestException('comment already lives on a task');
    const taskId = randomUUID();
    await this.db.query(
      `INSERT INTO task (id, org_id, project_id, title, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [taskId, orgId, projectId, comment.body.slice(0, 80), `Converted from a comment on ${comment.target_type}. Original: ${comment.body}`, actorId] as never[],
    );
    await this.db.query(
      'INSERT INTO task_source (task_id, source_type, source_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [taskId, 'comment', commentId],
    );
    await this.audit.log(orgId, actorId, 'comment.to_task', 'comment', commentId, { taskId });
       return { taskId };
}
}