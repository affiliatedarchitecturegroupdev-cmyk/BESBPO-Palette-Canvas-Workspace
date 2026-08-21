import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface NotificationRow {
  id: string;
  recipient_id: string;
  kind: string;
  target_type: string;
  target_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Consolidated notification inbox with unread indicators. Emitted by domain
 * events in other modules (assignment, mentions, status changes); reads are
 * scoped by capability `notifications.read` in the controller.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly db: Database) {}

  async emit(
    orgId: string,
    recipientId: string | null,
    kind: string,
    targetType: string,
    targetId: string,
    message: string,
  ): Promise<void> {
    if (!recipientId) return;
    await this.db.query(
      'INSERT INTO notification (id, org_id, recipient_id, kind, target_type, target_id, message) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [randomUUID(), orgId, recipientId, kind, targetType, targetId, message],
    );
  }

  async inbox(orgId: string, recipientId: string): Promise<NotificationRow[]> {
    const { rows } = await this.db.query<NotificationRow>(
      'SELECT id, recipient_id, kind, target_type, target_id, message, read_at, created_at FROM notification WHERE org_id = $1 AND recipient_id = $2 ORDER BY created_at DESC LIMIT 100',
      [orgId, recipientId],
    );
    return rows;
  }

  async unreadCount(orgId: string, recipientId: string): Promise<number> {
    const row = await this.db.one<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM notification WHERE org_id = $1 AND recipient_id = $2 AND read_at IS NULL',
      [orgId, recipientId],
    );
    return Number(row.count);
  }

  async markRead(orgId: string, recipientId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const { rows } = await this.db.query<{ id: string }>(
      'UPDATE notification SET read_at = now() WHERE org_id = $1 AND recipient_id = $2 AND id = ANY($3) AND read_at IS NULL RETURNING id',
      [orgId, recipientId, ids],
    );
    return rows.length;
  }
}
