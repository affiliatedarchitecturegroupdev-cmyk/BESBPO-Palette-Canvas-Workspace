import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { StorageService } from '../storage/storage.service';

export interface MediaInfo {
  format: string;
  width?: number;
  height?: number;
}

/** Dependency-free dimension extraction for common web formats. */
export function inspectMedia(bytes: Buffer, contentType: string): MediaInfo {
  if (contentType === 'image/png' && bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) {
    return { format: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (contentType === 'image/gif' && bytes.length > 10 && bytes.toString('ascii', 0, 3) === 'GIF') {
    return { format: 'gif', width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (contentType === 'image/jpeg' && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let off = 2;
    while (off + 9 < bytes.length) {
      if (bytes[off] !== 0xff) { off++; continue; }
      const marker = bytes[off + 1];
      // SOF0–SOF15 (except DHT/DAC/RST) carry dimensions
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'jpeg', height: bytes.readUInt16BE(off + 5), width: bytes.readUInt16BE(off + 7) };
      }
      const len = bytes.readUInt16BE(off + 2);
      off += 2 + len;
    }
    return { format: 'jpeg' };
  }
  if (contentType === 'image/svg+xml') {
    const text = bytes.toString('utf8');
    const w = /width="([\d.]+)/.exec(text);
    const h = /height="([\d.]+)/.exec(text);
    const vb = /viewBox="[\d.\s-]+?\s([\d.]+)\s([\d.]+)"/.exec(text);
    return {
      format: 'svg',
      width: w ? Number(w[1]) : vb ? Number(vb[1]) : undefined,
      height: h ? Number(h[1]) : vb ? Number(vb[2]) : undefined,
    };
  }
  return { format: 'unknown' };
}

/**
 * P6-12 media workers. `media.inspect` extracts format + dimensions into
 * asset metadata, then enqueues `media.thumbnail`. SVG thumbnails are the
 * asset itself (vector scales losslessly); raster thumbnailing records a
 * pending rendition for an external transcode worker — the orchestration and
 * retry/DLQ semantics are the deliverable here, pixel resizing is not.
 */
@Injectable()
export class MediaService implements OnModuleInit {
  constructor(
    private readonly jobs: JobsService,
    private readonly storage: StorageService,
  ) {}

  onModuleInit() {
    this.jobs.registerHandler('media.inspect', async (payload) => {
      const assetId = payload.assetId as string;
      const asset = await this.storage.getById(assetId);
      if (!asset) throw new Error(`asset ${assetId} not found`);
      const bytes = await this.storage.read(asset);
      const info = inspectMedia(bytes, asset.content_type);
      await this.storage.updateMetadata(assetId, { ...asset.metadata, media: info });
      await this.jobs.enqueue(asset.org_id, 'media.thumbnail', { assetId }, {
        idempotencyKey: `thumb-${assetId}`,
      });
    });

    this.jobs.registerHandler('media.thumbnail', async (payload) => {
      const assetId = payload.assetId as string;
      const asset = await this.storage.getById(assetId);
      if (!asset) throw new Error(`asset ${assetId} not found`);
      const media = (asset.metadata.media ?? {}) as MediaInfo;
      const rendition =
        media.format === 'svg'
          ? { kind: 'thumbnail', status: 'ready', source: 'self' }
          : { kind: 'thumbnail', status: 'pending-external-worker' };
      const renditions = [...((asset.metadata.renditions as unknown[]) ?? []), rendition];
      await this.storage.updateMetadata(assetId, { ...asset.metadata, renditions });
    });
  }
}
