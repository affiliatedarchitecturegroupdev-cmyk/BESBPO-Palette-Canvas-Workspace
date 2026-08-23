import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { DirectoryService } from './directory.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('directory')
export class DirectoryController {
  constructor(
    private readonly directory: DirectoryService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
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
}
