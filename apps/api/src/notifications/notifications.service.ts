import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { EventsService } from '../events/events.service';
import { JobsService } from '../jobs/jobs.service';

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
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly db: Database,
    private readonly events: EventsService,
    private readonly jobs: JobsService,
  ) {}

  /** P7-03: reminder jobs land on the P6-11 queue and emit on due. */
  onModuleInit() {
    this.jobs.registerHandler('notification.reminder', async (payload) => {
      const p = payload as { orgId: string; recipientId: string; message: string };
      await this.emit(p.orgId, p.recipientId, 'reminder', 'reminder', '', p.message);
    });
  }

  /** Schedule a reminder notification; delayMinutes 0 sends on the next drain. */
  async scheduleReminder(orgId: string, recipientId: string, message: string, delayMinutes = 0) {
    return this.jobs.enqueue(
      orgId,
      'notification.reminder',
      { orgId, recipientId, message },
      { delayMs: delayMinutes * 60_000 },
    );
  }

  async emit(
    orgId: string,
    recipientId: string | null,
    kind: string,
    targetType: string,
    targetId: string,
    message: string,
  ): Promise<void> {
    if (!recipientId) return;
    const id = randomUUID();
    await this.db.query(
      'INSERT INTO notification (id, org_id, recipient_id, kind, target_type, target_id, message) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, orgId, recipientId, kind, targetType, targetId, message],
    );
    this.events.publish(orgId, 'notification.created', {
      notificationId: id, recipient_id: recipientId, kind, message,
    });
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
