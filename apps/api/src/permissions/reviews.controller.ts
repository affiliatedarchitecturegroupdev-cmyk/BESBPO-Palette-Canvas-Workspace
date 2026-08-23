import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { PermissionsReviewsService } from './reviews.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('permissions/reviews')
export class PermissionsReviewsController {
  constructor(
    private readonly reviews: PermissionsReviewsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('status') status?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.PermissionsReview);
    return this.reviews.list(ctx.orgId, status);
  }

  @Get('overrides')
  async overrides(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.PermissionsReview);
    return this.reviews.overrides(ctx.orgId);
  }

  @Post()
  async propose(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { role: string; capability: string; effect: 'grant' | 'revoke'; rationale?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.PermissionsPropose);
    return this.reviews.propose(ctx.orgId, ctx.userId, body.role, body.capability, body.effect, body.rationale ?? '');
  }

  @Post(':id/decide')
  async decide(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { approve: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.PermissionsReview);
    return this.reviews.decide(ctx.orgId, id, ctx.userId, body.approve);
  }
}
