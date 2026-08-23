import { Body, Controller, Get, Headers, Param, Post, Patch, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { VersionsService } from './versions.service';
import { ApprovalsService } from './approvals.service';
import { HandoversService } from './handovers.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('proofing')
export class ProofingController {
  constructor(
    private readonly versions: VersionsService,
    private readonly approvals: ApprovalsService,
    private readonly handovers: HandoversService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  /* Versions + QA */

  @Get('versions/:deliverableId')
  async listVersions(@Headers('x-user-email') email: string | undefined, @Param('deliverableId') deliverableId: string) {
    const ctx = await this.identity.resolve(email);
    return this.versions.list(ctx.orgId, deliverableId);
  }

  @Post('versions/:deliverableId')
  async createVersion(
    @Headers('x-user-email') email: string | undefined,
    @Param('deliverableId') deliverableId: string,
    @Body() body: { label: string; uri: string; notes?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.VersionsWrite);
    return this.versions.create(ctx.orgId, ctx.userId, deliverableId, body);
  }

  @Get('versions/:versionId/qa')
  async listQa(@Headers('x-user-email') email: string | undefined, @Param('versionId') versionId: string) {
    const ctx = await this.identity.resolve(email);
    return this.versions.qa(ctx.orgId, versionId);
  }

  @Post('versions/:versionId/qa')
  async addQa(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Body() body: { label: string; kind?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.QaWrite);
    return this.versions.addQa(ctx.orgId, versionId, body);
  }

  @Patch('versions/:versionId/qa/:itemId')
  async checkQa(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Param('itemId') itemId: string,
    @Body() body: { passed: boolean; note?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.QaWrite);
    return this.versions.checkQa(ctx.orgId, versionId, itemId, ctx.userId, body.passed, body.note);
  }

  /* P6-05: annotations + compare */

  @Get('versions/:versionId/annotations')
  async listAnnotations(@Headers('x-user-email') email: string | undefined, @Param('versionId') versionId: string) {
    const ctx = await this.identity.resolve(email);
    return this.versions.annotations(ctx.orgId, versionId);
  }

  @Post('versions/:versionId/annotations')
  async addAnnotation(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Body() body: { x?: number; y?: number; body: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AnnotationsWrite);
    return this.versions.addAnnotation(ctx.orgId, ctx.userId, versionId, body);
  }

  @Patch('versions/:versionId/annotations/:annotationId')
  async resolveAnnotation(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Param('annotationId') annotationId: string,
    @Body() body: { resolved: boolean },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AnnotationsWrite);
    return this.versions.resolveAnnotation(ctx.orgId, versionId, annotationId, body.resolved);
  }

  @Get('deliverables/:deliverableId/compare')
  async compare(
    @Headers('x-user-email') email: string | undefined,
    @Param('deliverableId') deliverableId: string,
    @Query('a') a: string | undefined,
    @Query('b') b: string | undefined,
  ) {
    const ctx = await this.identity.resolve(email);
    return this.versions.compare(ctx.orgId, deliverableId, a ?? '', b ?? '');
  }

  /* Approvals */

  @Get('approvals/:versionId')
  async listApprovals(@Headers('x-user-email') email: string | undefined, @Param('versionId') versionId: string) {
    const ctx = await this.identity.resolve(email);
    return this.approvals.list(ctx.orgId, versionId);
  }

  @Post('approvals/:versionId')
  async requestApproval(
    @Headers('x-user-email') email: string | undefined,
    @Param('versionId') versionId: string,
    @Body() body?: { dueAt?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalsRequest);
    return this.approvals.request(ctx.orgId, ctx.userId, versionId, body?.dueAt);
  }

  @Post('approvals/:id/decide')
  async decide(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'changes_requested'; note?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalsDecide);
    return this.approvals.decide(ctx.orgId, ctx.userId, id, body.decision, body.note);
  }

  /* Change requests */

  @Get('projects/:projectId/changes')
  async listChanges(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    return this.approvals.listChanges(ctx.orgId, projectId);
  }

  @Post('projects/:projectId/changes')
  async proposeChange(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { title: string; scopeNote?: string; impactHours?: number; impactCost?: number; approvalId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChangeWrite);
    return this.approvals.proposeChange(ctx.orgId, ctx.userId, projectId, body);
  }

  @Post('changes/:id/decide')
  async decideChange(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { decision: 'accepted' | 'declined' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ChangeWrite);
    return this.approvals.decideChange(ctx.orgId, ctx.userId, id, body.decision);
  }

  /* Handover */

  @Get('projects/:projectId/handover')
  async handover(@Headers('x-user-email') email: string | undefined, @Param('projectId') projectId: string) {
    const ctx = await this.identity.resolve(email);
    const pkg = await this.handovers.package(ctx.orgId, projectId);
    if (!pkg) return null;
    return { ...pkg, items: (await this.handovers.items(ctx.orgId, pkg.id)) as unknown[] };
  }

  @Post('projects/:projectId/handover')
  async createHandover(
    @Headers('x-user-email') email: string | undefined,
    @Param('projectId') projectId: string,
    @Body() body: { title: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.HandoverWrite);
    return this.handovers.create(ctx.orgId, ctx.userId, projectId, body.title);
  }

  @Post('handover/:packageId/items')
  async addItem(
    @Headers('x-user-email') email: string | undefined,
    @Param('packageId') packageId: string,
    @Body() body: { versionId: string; licence?: string; sourceIncluded?: boolean; notes?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.HandoverWrite);
    return this.handovers.addItem(ctx.orgId, packageId, body.versionId, body);
  }

  @Post('handover/:packageId/status')
  async setStatus(
    @Headers('x-user-email') email: string | undefined,
    @Param('packageId') packageId: string,
    @Body() body: { status: 'ready' | 'delivered' },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.HandoverWrite);
    return this.handovers.setStatus(ctx.orgId, packageId, body.status);
  }
}
