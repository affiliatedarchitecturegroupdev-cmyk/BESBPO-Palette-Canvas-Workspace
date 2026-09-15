import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { AgentsService } from './agents.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  /** Agent catalog with declared autonomy levels (spec §12.2). */
  @Get()
  catalog() {
    return this.agents.catalog();
  }

  @Post(':key/run')
  async run(
    @Headers('x-user-email') email: string | undefined,
    @Param('key') key: string,
    @Body() body: { itemId?: string; payload?: Record<string, unknown> },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AgentsRun);
    return this.agents.runAgent(ctx, key, body);
  }

  @Get('runs')
  async runs(@Headers('x-user-email') email: string | undefined, @Query('itemId') itemId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AgentsRun);
    return this.agents.listRuns(ctx, itemId);
  }

  /** Human decision on a proposal — the accountability boundary (§12.1). */
  @Post('runs/:id/decide')
  async decide(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { decision: 'confirmed' | 'rejected' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AiReview);
    return this.agents.decide(ctx, id, body.decision);
  }
}