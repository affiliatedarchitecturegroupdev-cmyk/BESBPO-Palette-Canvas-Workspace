import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { Capability } from '@palette-canvas/shared';
import { FilesService } from './files.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';

@Controller('files')
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
  ) {}

  @Post()
  async upload(
    @Headers('x-user-email') email: string | undefined,
    @Body()
    body: {
      name: string;
      content?: string;
      contentType?: string;
      source?: string;
      externalRef?: string;
      engagementId?: string;
      metadata?: Record<string, unknown>;
      supersedes?: string;
    },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.FilesWrite);
    return this.files.upload(ctx, body);
  }

  @Get()
  async list(@Headers('x-user-email') email: string | undefined, @Query('engagementId') engagementId?: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.FilesRead);
    return this.files.list(ctx, engagementId);
  }

  @Get(':id/versions')
  async versions(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.FilesRead);
    return this.files.versions(ctx, id);
  }

  @Get('items/:itemId')
  async itemFiles(@Headers('x-user-email') email: string | undefined, @Param('itemId') itemId: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.FilesRead);
    return this.files.itemFiles(itemId);
  }

  @Post('items/:itemId/attach')
  async attach(
    @Headers('x-user-email') email: string | undefined,
    @Param('itemId') itemId: string,
    @Body() body: { fileId: string; columnId?: string },
  ) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.FilesWrite);
    return this.files.attachToItem(ctx, itemId, body.fileId, body.columnId);
  }
}