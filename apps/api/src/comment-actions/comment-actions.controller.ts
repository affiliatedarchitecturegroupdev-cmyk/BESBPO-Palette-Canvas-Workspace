import { Body, Controller, Delete, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { CommentActionsService } from './comment-actions.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('comments')
export class CommentActionsController {
  constructor(
    private readonly actions: CommentActionsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  /* P8-05 reactions */

  @Get(':id/reactions')
  async reactions(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    return this.actions.reactions(ctx.orgId, id);
  }

  @Post(':id/reactions')
  async addReaction(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { emoji: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReactionsWrite);
    return this.actions.addReaction(ctx.orgId, ctx.userId, id, body.emoji);
  }

  @Delete(':id/reactions/:emoji')
  async removeReaction(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Param('emoji') emoji: string,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ReactionsWrite);
    return this.actions.removeReaction(ctx.orgId, id, ctx.userId, emoji);
  }

  /* P8-06 attachments */

  @Get(':id/assets')
  async assets(@Headers('x-user-email') email: string | undefined,@Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    return this.actions.assets(ctx.orgId, id);
  }

  @Post(':id/assets')
  async attach(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { assetId: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommentAssetsWrite);
    return this.actions.attachAsset(ctx.orgId, ctx.userId, id, body.assetId);
  }

  @Delete(':id/assets/:assetId')
  async detach(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Param('assetId') assetId: string,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommentAssetsWrite);
    return this.actions.detachAsset(ctx.orgId, ctx.userId, id, assetId);
  }

  /* P8-07 message-to-task */

  @Post(':id/to-task')
  async toTask(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { projectId: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.MessageToTask);
    return this.actions.toTask(ctx.orgId, ctx.userId, id, body.projectId);
  }
}