import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { RiskService } from './risk.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('projects/:projectId/risks')
export class RiskController {
  constructor(
    private readonly risks: RiskService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined,@Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    return this.risks.list(ctx.orgId, projectId);
  }

  @Post()
  async create(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { title: string; severity?: 'low' | 'medium' | 'high'; ownerId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RiskManage);
    return this.risks.create(ctx.orgId, ctx.userId, projectId, body);
  }

  @Patch(':id')
  async updateStatus(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: 'open' | 'mitigated' | 'accepted' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.RiskManage);
    return this.risks.updateStatus(ctx.orgId, ctx.userId, id, body.status);
  }
}