import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { NotificationsService } from '../notifications/notifications.service';

export interface CommentRow {
  id: string;
  target_type: string;
  target_id: string;
  body: string;
  mentions: string[];
  created_by: string;
  created_at: string;
  resolved: boolean;
}

/** Work-linked comments. Mentions embed person ids and emit notifications. */
@Injectable()
export class CommentsService {
  constructor(
    private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async list(orgId: string, targetType: string, targetId: string): Promise<CommentRow[]> {
    const { rows } = await this.db.query<CommentRow>(
      `SELECT id, target_type, target_id, body, mentions, created_by, created_at, resolved
       FROM comment WHERE org_id = $1 AND target_type = $2 AND target_id = $3
       ORDER BY created_at`,
      [orgId, targetType, targetId],
    );
    return rows.map((r) => ({ ...r, mentions: r.mentions ?? [] }));
  }

  /** Resolve @FirstName tokens to org people; explicit ids pass through too. */
  private async mentionIds(orgId: string, body: string, explicit: string[]): Promise<string[]> {
    const tokens = body.match(/@([A-Za-z]+)/g);
    if (!tokens || tokens.length === 0) return explicit;
    const { rows } = await this.db.query<{ id: string; name: string }>('SELECT id, name FROM person WHERE org_id = $1', [orgId]);
    const resolved = new Set(explicit);
    for (const token of tokens) {
      const name = token.slice(1).toLowerCase();
      const hit = rows.find((r) => r.name.toLowerCase().startsWith(name));
      if (hit) resolved.add(hit.id);
    }
    return [...resolved];
  }

  async create(
    orgId: string,
    createdBy: string,
    targetType: string,
    targetId: string,
    body: string,
    mentions: string[] = [],
  ): Promise<CommentRow> {
    const ids = await this.mentionIds(orgId, body, mentions);
    const row = await this.db.one<CommentRow>(
      `INSERT INTO comment (id, org_id, target_type, target_id, body, mentions, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, target_type, target_id, body, mentions, created_by, created_at, resolved`,
      [randomUUID(), orgId, targetType, targetId, body, JSON.stringify(ids), createdBy] as never[],
    );
    for (const mentionedId of ids) {
      await this.notifications.emit(
        orgId,
        mentionedId,
        'mentioned',
        targetType,
        targetId,
        `You were mentioned on ${targetType}: "${body.slice(0, 80)}"`,
      );
    }
    return { ...row, mentions: ids };
  }

  async resolve(orgId: string, id: string): Promise<CommentRow> {
    const row = await this.db.one<CommentRow>(
      'UPDATE comment SET resolved = NOT resolved WHERE org_id = $1 AND id = $2 RETURNING id, target_type, target_id, body, created_by, created_at, resolved',
      [orgId, id],
    );
    return { ...row, mentions: [] };
  }
}
