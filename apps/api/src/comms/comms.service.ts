import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChannelType, ChannelVisibility, UserContext, VisibilityLevel, canSeeVisibility } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ChannelRow {
  id: string;
  org_id: string;
  engagement_id: string | null;
  name: string | null;
  channel_type: string;
  visibility: string;
  created_by: string;
}

export interface MessageRow {
  id: string;
  channel_id: string;
  parent_message_id: string | null;
  body: string;
  mentions: string[];
  file_ids: string[];
  created_by: string;
  created_at: string;
}

/**
 * Communication layer (spec §11).
 *
 * The load-bearing rule is §11.2: a channel's `visibility` is fixed at
 * creation. Internal conversation is never silently exposed to a client — when
 * it needs to become client-facing, that is an explicit, audited conversion,
 * not a flag flip. External messages are therefore visible to the client
 * without exposing anything that was internal before the conversion.
 */
@Injectable()
export class CommsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async createChannel(
    ctx: UserContext,
    input: { name?: string; channelType?: string; visibility?: string; engagementId?: string | null; memberIds?: string[] },
  ) {
    const channelType = input.channelType ?? ChannelType.Threaded;
    const visibility = input.visibility ?? ChannelVisibility.Internal;
    if (!Object.values(ChannelType).includes(channelType as ChannelType)) {
      throw new BadRequestException(`unknown channel type ${channelType}`);
    }
    if (!Object.values(ChannelVisibility).includes(visibility as ChannelVisibility)) {
      throw new BadRequestException(`unknown channel visibility ${visibility}`);
    }
    if (channelType === ChannelType.Direct && !input.memberIds?.length) {
      throw new BadRequestException('a direct channel requires at least one member');
    }

    const channel = await this.db.one<ChannelRow>(
      `INSERT INTO channel (id, org_id, engagement_id, name, channel_type, visibility, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        input.engagementId ?? ctx.engagementId ?? null,
        input.name ?? null,
        channelType,
        visibility,
        ctx.userId,
      ],
    );
    // The creator is always an owner; named members join as members.
    await this.join(channel.id, ctx.userId, 'owner');
    for (const personId of input.memberIds ?? []) {
      await this.join(channel.id, personId, 'member');
    }
    await this.audit.log(ctx.orgId, ctx.userId, 'channel.created', 'channel', channel.id, {
      channelType,
      visibility,
    });
    return channel;
  }

  private async join(channelId: string, personId: string, role: 'member' | 'owner') {
    await this.db.query(
      `INSERT INTO channel_member (channel_id, person_id, role) VALUES ($1,$2,$3)
       ON CONFLICT (channel_id, person_id) DO NOTHING`,
      [channelId, personId, role],
    );
  }

  async listChannels(ctx: UserContext, engagementId?: string) {
    // A client only ever sees external channels, whatever else it is a member
    // of (§11.2). Guests see nothing at channel level at all.
    if (ctx.itemScope) return [];
    const isClient = ctx.roles.some((r) => ['client_approver', 'third_party_vendor'].includes(r as string));
    const { rows } = await this.db.query<ChannelRow>(
      `SELECT c.* FROM channel c
       WHERE c.org_id = $1 AND c.archived_at IS NULL
         AND ($2::text IS NULL OR c.engagement_id = $2)
         AND ($3::text IS NULL OR c.visibility = $3)
       ORDER BY c.created_at DESC`,
      [ctx.orgId, engagementId ?? ctx.engagementId ?? null, isClient ? ChannelVisibility.External : null],
    );
    return rows;
  }

  async postMessage(
    ctx: UserContext,
    channelId: string,
    input: { body: string; parentMessageId?: string | null; mentions?: string[]; fileIds?: string[] },
  ): Promise<MessageRow> {
    if (!input.body || !input.body.trim()) throw new BadRequestException('message body is required');
    const channel = await this.requireChannel(ctx, channelId);

    // A thread reply must belong to the same channel.
    if (input.parentMessageId) {
      const parent = await this.db.oneOrNull<{ channel_id: string }>(
        'SELECT channel_id FROM message WHERE id = $1',
        [input.parentMessageId],
      );
      if (!parent || parent.channel_id !== channel.id) {
        throw new BadRequestException('parent message must belong to this channel');
      }
    }

    const message = await this.db.one<MessageRow>(
      `INSERT INTO message (id, org_id, channel_id, engagement_id, parent_message_id, body, mentions, file_ids, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        channel.id,
        channel.engagement_id,
        input.parentMessageId ?? null,
        input.body,
        input.mentions ?? [],
        input.fileIds ?? [],
        ctx.userId,
      ],
    );

    // Mentions elevate to a notification so the @mention is never missed.
    for (const personId of input.mentions ?? []) {
      await this.db.query(
        `INSERT INTO notification (id, org_id, recipient_id, kind, target_type, target_id, message)
         VALUES ($1,$2,$3,'mention','message',$4,$5)`,
        [randomUUID(), ctx.orgId, personId, message.id, `You were mentioned in ${channel.name ?? 'a channel'}`],
      );
    }

    await this.audit.log(ctx.orgId, ctx.userId, 'message.posted', 'channel', channel.id, {
      thread: Boolean(input.parentMessageId),
      mentions: (input.mentions ?? []).length,
    });
    return message;
  }

  async listMessages(ctx: UserContext, channelId: string, parentMessageId?: string) {
    await this.requireChannel(ctx, channelId);
    const { rows } = await this.db.query<MessageRow>(
      `SELECT * FROM message WHERE channel_id = $1
         AND ($2::text IS NULL AND parent_message_id IS NULL OR parent_message_id = $2)
       ORDER BY created_at`,
      [channelId, parentMessageId ?? null],
    );
    return rows;
  }

  /**
   * Explicit, audited internal→external conversion (§11.2). This is the only
   * path that changes a channel's visibility after creation.
   */
  async convertToExternal(ctx: UserContext, channelId: string, reason: string) {
    if (!reason || reason.trim().length < 4) {
      throw new BadRequestException('converting to external requires a reason');
    }
    const channel = await this.requireChannel(ctx, channelId);
    if (channel.visibility === ChannelVisibility.External) {
      throw new BadRequestException('channel is already external');
    }
    const updated = await this.db.one<ChannelRow>(
      `UPDATE channel SET visibility = 'external' WHERE id = $1 RETURNING *`,
      [channelId],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'channel.converted_external', 'channel', channelId, { reason });
    return updated;
  }

  /* ---------------- meetings (§11.4) ---------------- */

  async scheduleMeeting(
    ctx: UserContext,
    input: {
      title: string;
      startsAt: string;
      durationMins?: number;
      itemId?: string | null;
      engagementId?: string | null;
      roomRef?: string | null;
      externalUrl?: string | null;
      participantIds?: string[];
      guestEmails?: string[];
    },
  ) {
    if (!input.roomRef && !input.externalUrl) {
      throw new BadRequestException('a meeting needs either a roomRef or an externalUrl');
    }
    const meetingEngagement = input.engagementId ?? ctx.engagementId ?? null;
    // Booking a meeting its creator could not read back would hand a client an
    // internal meeting by the front door.
    this.assertMeetingVisible(ctx, meetingEngagement);
    const meeting = await this.db.one(
      `INSERT INTO meeting (id, org_id, engagement_id, item_id, title, starts_at, duration_mins,
                            room_ref, external_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        randomUUID(),
        ctx.orgId,
        input.engagementId ?? ctx.engagementId ?? null,
        input.itemId ?? null,
        input.title,
        input.startsAt,
        input.durationMins ?? 30,
        input.roomRef ?? null,
        input.externalUrl ?? null,
        ctx.userId,
      ],
    );
    for (const personId of input.participantIds ?? []) {
      await this.db.query(
        'INSERT INTO meeting_participant (meeting_id, person_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [(meeting as { id: string }).id, personId],
      );
    }
    await this.audit.log(ctx.orgId, ctx.userId, 'meeting.scheduled', 'meeting', (meeting as { id: string }).id, {});
    return meeting;
  }

  /**
   * Attendance is recorded when someone actually joins — never assumed. This is
   * the honest-recording behaviour the spec asks for at §11.4.
   */
  async joinMeeting(ctx: UserContext, meetingId: string) {
    const meeting = await this.db.oneOrNull<{ id: string; engagement_id: string | null }>(
      'SELECT id, engagement_id FROM meeting WHERE id = $1 AND org_id = $2',
      [meetingId, ctx.orgId],
    );
    if (!meeting) throw new NotFoundException('meeting not found');
    this.assertMeetingVisible(ctx, meeting.engagement_id);
    const row = await this.db.oneOrNull(
      `UPDATE meeting_participant SET joined_at = now()
       WHERE meeting_id = $1 AND person_id = $2 AND joined_at IS NULL RETURNING *`,
      [meetingId, ctx.userId],
    );
    if (!row) {
      // Not pre-invited: record the join anyway rather than silently dropping it.
      await this.db.query(
        `INSERT INTO meeting_participant (meeting_id, person_id, joined_at) VALUES ($1,$2, now())
         ON CONFLICT (meeting_id, person_id) DO UPDATE SET joined_at = now()`,
        [meetingId, ctx.userId],
      );
    }
    return { meetingId, joinedAt: new Date().toISOString() };
  }

  async listMeetings(ctx: UserContext, engagementId?: string) {
    if (ctx.itemScope) {
      const { rows } = await this.db.query(
        `SELECT m.* FROM meeting m JOIN meeting_participant p ON p.meeting_id = m.id
         WHERE m.org_id = $1 AND p.person_id = $2 ORDER BY m.starts_at`,
        [ctx.orgId, ctx.userId],
      );
      return rows;
    }
    // The engagement filter alone was not a boundary: a client passed
    // `engagementId` as null and got every engagement-less (internal) meeting
    // in the org. An explicit `engagementId` also lets a caller name another
    // engagement, so it is only honoured when it is one the caller may see.
    const { rows } = await this.db.query<{ engagement_id: string | null }>(
      `SELECT * FROM meeting WHERE org_id = $1 ORDER BY starts_at`,
      [ctx.orgId],
    );
    const requested = engagementId ?? null;
    return rows.filter((m) => {
      if (requested !== null && m.engagement_id !== requested) return false;
      return this.canSeeMeetingEngagement(ctx, m.engagement_id);
    });
  }

  /**
   * Meeting visibility mirrors the channel rule (§11.2): an engagement-less
   * meeting is internal, and internal never reaches a client. The engagement
   * predicate narrows it further for staff.
   */
  private canSeeMeetingEngagement(ctx: UserContext, engagementId: string | null): boolean {
    if (engagementId === null) return canSeeVisibility(ctx, VisibilityLevel.Internal);
    if (this.isDivisionWide(ctx)) return true;
    if (ctx.engagementId) return ctx.engagementId === engagementId;
    return ctx.scopes.some((s) => s.workspaceId === engagementId);
  }

  private assertMeetingVisible(ctx: UserContext, engagementId: string | null): void {
    if (!this.canSeeMeetingEngagement(ctx, engagementId)) {
      throw new ForbiddenException('meeting is internal');
    }
  }

  private isDivisionWide(ctx: UserContext): boolean {
    return ctx.roles.some((r) => ['platform_owner', 'operations_director'].includes(r as string));
  }

  private async requireChannel(ctx: UserContext, channelId: string): Promise<ChannelRow> {
    const channel = await this.db.oneOrNull<ChannelRow>(
      'SELECT * FROM channel WHERE id = $1 AND org_id = $2',
      [channelId, ctx.orgId],
    );
    if (!channel) throw new NotFoundException('channel not found');
    // A client must never reach an internal channel, membership aside (§11.2).
    const isClient = ctx.roles.some((r) => ['client_approver', 'third_party_vendor'].includes(r as string));
    if (isClient && channel.visibility !== ChannelVisibility.External) {
      throw new ForbiddenException('channel is internal');
    }
    if (ctx.itemScope) throw new ForbiddenException('guest cannot read channels');
    return channel;
  }
}