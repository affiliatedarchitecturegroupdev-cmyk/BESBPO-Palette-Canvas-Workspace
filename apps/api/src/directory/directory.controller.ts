import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { DirectoryService } from './directory.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { AuditService } from '../audit/audit.service';

@Controller('directory')
export class DirectoryController {
  constructor(
    private readonly directory: DirectoryService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  @Get('agencies')
  async agencies(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryRead);
    return this.directory.listAgencies(ctx.orgId, this.authz.agencyFilter(ctx));
  }

  @Post('agencies')
  async createAgency(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { name: string; confidentialityTier?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryManage);
    return this.directory.createAgency(ctx.orgId, body.name, body.confidentialityTier);
  }

  @Get('brands')
  async brands(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryRead);
    return this.directory.listBrands(ctx.orgId, this.authz.agencyFilter(ctx));
  }

  @Post('brands')
  async createBrand(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { agencyId: string; name: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryManage);
    return this.directory.createBrand(ctx.orgId, body.agencyId, body.name);
  }

  @Get('agencies/:id/contacts')
  async contacts(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryRead);
    return this.directory.listContacts(id);
  }

  @Post('agencies/:id/contacts')
  async createContact(
    @Headers('x-user-email') email: string | undefined,
    @Param('id') id: string,
    @Body() body: { name: string; email: string; roleLabel?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.DirectoryManage);
    return this.directory.createContact(id, body.name, body.email, body.roleLabel);
  }

  /* ---------------- members (A-04) ---------------- */

  @Get('members')
  async members(@Headers('x-user-email') email: string | undefined) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.InvitesManage);
    return this.directory.listMembers(ctx.orgId);
  }

  /**
   * Revoke a member's org access by deleting every binding they hold here.
   * Refuses to remove the caller's own bindings: an admin who revokes
   * themselves locks the org out of its last administrator, and that is not a
   * recoverable state through the product.
   */
  @Delete('members/:personId/roles')
  async revokeMemberRoles(
    @Headers('x-user-email') email: string | undefined,
    @Param('personId') personId: string,
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.InvitesManage);
    if (personId === ctx.userId) {
      throw new ForbiddenException('cannot revoke your own access');
    }
    const removed = await this.directory.removeBindings(ctx.orgId, personId);
    await this.audit.log(ctx.orgId, ctx.userId, 'member.roles_revoked', 'person', personId, {
      removed,
    });
    return { removed };
  }
}
