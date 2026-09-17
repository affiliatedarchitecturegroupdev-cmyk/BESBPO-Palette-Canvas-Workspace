import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { CommsService } from './comms.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('comms')
export class CommsController {
  constructor(
    private readonly comms: CommsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Post('channels')
  async createChannel(
    @Headers('x-user-email') email: string | undefined,
    @Body()
    body: { name?: string; channelType?: string; visibility?: string; engagementId?: string; memberIds?: string[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChannelsWrite);
    return this.comms.createChannel(ctx, body);
  }

  @Get('channels')
  async listChannels(@Headers('x-user-email') email: string | undefined, @Query('engagementId') engagementId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChannelsRead);
    return this.comms.listChannels(ctx, engagementId);
  }

  @Post('channels/:id/messages')
  async postMessage(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') channelId: string,
    @Body() body: { body: string; parentMessageId?: string; mentions?: string[]; fileIds?: string[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChannelsWrite);
    return this.comms.postMessage(ctx, channelId, body);
  }

  @Get('channels/:id/messages')
  async listMessages(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') channelId: string,
    @Query('parentMessageId') parentMessageId?: string,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChannelsRead);
    return this.comms.listMessages(ctx, channelId, parentMessageId);
  }

  /** Explicit internal→external conversion (§11.2) — audited, never silent. */
  @Post('channels/:id/convert-external')
  async convert(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') channelId: string,
    @Body() body: { reason: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChannelsWrite);
    return this.comms.convertToExternal(ctx, channelId, body.reason);
  }

  @Post('meetings')
  async scheduleMeeting(
    @Headers('x-user-email') email: string | undefined,
    @Body()
    body: {
      title: string;
      startsAt: string;
      durationMins?: number;
      itemId?: string;
      engagementId?: string;
      roomRef?: string;
      externalUrl?: string;
      participantIds?: string[];
      guestEmails?: string[];
    },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.MeetingsWrite);
    return this.comms.scheduleMeeting(ctx, body);
  }

  @Get('meetings')
  async listMeetings(@Headers('x-user-email') email: string | undefined, @Query('engagementId') engagementId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.MeetingsRead);
    return this.comms.listMeetings(ctx, engagementId);
  }

  @Post('meetings/:id/join')
  async joinMeeting(@Headers('x-user-email') email: string | undefined, @Param('id') meetingId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.MeetingsWrite);
    return this.comms.joinMeeting(ctx, meetingId);
  }
}