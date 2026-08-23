import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { AiService } from './ai.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get('opt-in')
  async getOptIn(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AiReview);
    return { enabled: await this.ai.optIn(ctx.orgId) };
  }

  @Patch('opt-in')
  async setOptIn(@Headers('x-user-email') email: string | undefined, @Body() body: { enabled: boolean }) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AiOptInManage);
    return { enabled: await this.ai.setOptIn(ctx.orgId, ctx.userId, body.enabled) };
  }

  @Get('actions')
  async list(@Headers('x-user-email') email: string | undefined, @Query('status') status?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AiReview);
    return this.ai.list(ctx.orgId, status);
  }

  /** Agent-facing: propose an external change. Never executes directly. */
  @Post('actions')
  async propose(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { kind: string; payload?: Record<string, unknown> },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.IntegrationsRead);
    return this.ai.propose(ctx.orgId, ctx.userId, body.kind, body.payload ?? {});
  }

  @Post('actions/:id/decide')
  async decide(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { approve: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AiReview);
    return this.ai.decide(ctx.orgId, id, ctx.userId, body.approve);
  }
}
