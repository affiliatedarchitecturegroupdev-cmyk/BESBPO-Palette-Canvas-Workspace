import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { QualityService } from './quality.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('proofing')
export class QualityController {
  constructor(
    private readonly quality: QualityService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  /* P8-09 automated technical checks */

  @Get('versions/:versionId/technical-checks')
  async technicalChecks(@Headers('x-user-email') email: string | undefined,@Param('versionId') versionId: string) {
    const ctx = await this.identity.resolve(email);
    return this.quality.technicalChecks(ctx.orgId, versionId);
  }

  @Post('versions/:versionId/technical-checks')
  async runCheck(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Body() body: { name: string; passed: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.TechnicalChecksWrite);
    return this.quality.runTechnicalCheck(ctx.orgId, versionId, body);
  }

  /* P8-10 QA reviewer assignment */

  @Get('versions/:versionId/qa-reviewers')
  async qaReviewers(@Headers('x-user-email') email: string | undefined,@Param('versionId') versionId: string) {
    const ctx = await this.identity.resolve(email);
    return this.quality.qaReviewers(ctx.orgId, versionId);
  }

  @Post('versions/:versionId/qa-reviewers')
  async assignQa(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Body() body: { reviewerId: string; dueAt?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.QaReviewAssign);
    return this.quality.assignQaReviewer(ctx.orgId, ctx.userId, versionId, body);
  }

  @Post('qa-reviewers/:id/complete')
  async completeQa(@Headers('x-user-email') email: string | undefined,@Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.QaReviewAssign);
    return this.quality.completeQaReview(ctx.orgId, id);
  }
}