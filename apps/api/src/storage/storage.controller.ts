import { Body, Controller, ForbiddenException, Get, Headers, NotFoundException, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Capability } from '@palette-canvas/shared';
import { StorageService, AssetRow } from './storage.service';
import { IdentityService } from '../identity/identity.service';
import { AuthzService } from '../identity/authz.service';
import { JobsService } from '../jobs/jobs.service';

@Controller('assets')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly identity: IdentityService,
    private readonly authz: AuthzService,
    private readonly jobs: JobsService,
  ) {}

  @Get()
  async list(@Headers('x-user-email') email: string | undefined): Promise<AssetRow[]> {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AssetsRead);
    return this.storage.list(ctx.orgId);
  }

  @Post()
  async upload(
    @Headers('x-user-email') email: string | undefined,
    @Body() body: { key: string; contentType: string; dataBase64: string },
  ) {
    const ctx = await this.identity.resolve(email);
    // requireEffective: asset write is override-aware (B-02 permission reviews)
    await this.authz.requireEffective(ctx, Capability.AssetsWrite);
    const bytes = Buffer.from(body.dataBase64, 'base64');
    const asset = await this.storage.put(ctx.orgId, ctx.userId, body.key, bytes, body.contentType);
    await this.jobs.enqueue(ctx.orgId, 'media.inspect', { assetId: asset.id }, { idempotencyKey: `inspect-${asset.id}` });
    return asset;
  }

  @Get(':id/url')
  async url(@Headers('x-user-email') email: string | undefined, @Param('id') id: string) {
    const ctx = await this.identity.resolve(email);
    this.authz.require(ctx, Capability.AssetsRead);
    const asset = await this.storage.get(ctx.orgId, id);
    if (!asset) throw new NotFoundException('asset not found');
    return { url: this.storage.signedUrl(asset.id), sha256: asset.sha256 };
  }

  /** Signed-URL download — the signature is the credential, no session needed. */
  @Get('file/:id')
  async file(
    @Param('id') id: string,
    @Query('expires') expires: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!this.storage.verify(id, Number(expires), sig ?? '')) {
      throw new ForbiddenException('invalid or expired signature');
    }
    const asset = await this.storage.getById(id);
    if (!asset) throw new NotFoundException('asset not found');
    const bytes = await this.storage.read(asset);
    res.setHeader('content-type', asset.content_type);
    res.setHeader('content-length', bytes.length);
    res.send(bytes);
  }
}
