import { Controller, Get, Headers, NotFoundException, Param, Post } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Capability } from '@palette-canvas/shared';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

/**
 * P7-05 e-sign integration point (stub). An envelope is created against an
 * approval and later completed via the completion endpoint — where a real
 * provider webhook (DocuSign/Dropbox Sign connect) would call in. Completing
 * an envelope records signature status only; it does not decide the approval.
 */
@Controller('proofing')
export class EsignController {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Post('approvals/:id/esign')
  async send(@Headers('x-user-email') email: string | undefined, @Param('id') approvalId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalsRequest);
    const approval = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM approval WHERE id = $1 AND org_id = $2',
      [approvalId, ctx.orgId],
    );
    if (!approval) throw new NotFoundException('approval not found');
    const row = await this.db.one(
      'INSERT INTO esign_envelope (id, org_id, approval_id) VALUES ($1, $2, $3) RETURNING *',
      [randomUUID(), ctx.orgId, approvalId],
    );
    await this.audit.log(ctx.orgId, ctx.userId, 'esign.envelope_sent', 'esign_envelope', (row as { id: string }).id, { approvalId });
    return row;
  }

  @Get('approvals/:id/esign')
  async latest(@Headers('x-user-email') email: string | undefined, @Param('id') approvalId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalsRequest);
    const row = await this.db.oneOrNull(
      'SELECT * FROM esign_envelope WHERE approval_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 1',
      [approvalId, ctx.orgId],
    );
    if (!row) throw new NotFoundException('no envelope for approval');
    return row;
  }

  /** Provider-webhook stand-in: marks the envelope completed. */
  @Post('esign/:id/complete')
  async complete(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.ApprovalsDecide);
    const row = await this.db.oneOrNull(
      `UPDATE esign_envelope SET status = 'completed', updated_at = now()
       WHERE id = $1 AND org_id = $2 RETURNING *`,
      [id, ctx.orgId],
    );
    if (!row) throw new NotFoundException('envelope not found');
    await this.audit.log(ctx.orgId, ctx.userId, 'esign.envelope_completed', 'esign_envelope', id, {});
    return row;
  }
}
