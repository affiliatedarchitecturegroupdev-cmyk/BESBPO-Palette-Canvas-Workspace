import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { NotificationsService } from './notifications.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

/** Consolidated notification inbox per the planning document (comments/mentions/unread). */
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async inbox(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.NotificationsRead);
    const [items, unread] = await Promise.all([
      this.notifications.inbox(ctx.orgId, ctx.userId),
      this.notifications.unreadCount(ctx.orgId, ctx.userId),
    ]);
    return { items, unread };
  }

  @Post('mark-read')
  async markRead(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { ids: string[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.NotificationsRead);
    const marked = await this.notifications.markRead(ctx.orgId, ctx.userId, body.ids ?? []);
    return { marked };
  }

  @Get(':id/related')
  async relatedTarget(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
  ) {
    // Convenience for UI navigation: expand a notification with its target row.
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.NotificationsRead);
    const row = await this.notifications.inbox(ctx.orgId, ctx.userId);
    return row.find((n) => n.id === id) ?? null;
  }
}
