import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { CommentsService } from './comments.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get(':targetType/:targetId')
  async list(
    @Headers('x-user-email') email: string | undefined,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    const ctx = await this.identity.resolve(email);
    // Read access follows the underlying target's read capability; comments
    // do not add visibility of their own.
    return this.comments.list(ctx.orgId, targetType, targetId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { targetType: string; targetId: string; body: string; mentions?: string[] },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommentsWrite);
    return this.comments.create(ctx.orgId, ctx.userId, body.targetType, body.targetId, body.body, body.mentions ?? []);
  }

  @Post(':id/resolve')
  async resolve(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.CommentsResolve);
    return this.comments.resolve(ctx.orgId, id);
  }
}
