import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { NotificationsService } from '../notifications/notifications.service';

export interface HandoverRow {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  status: string;
  created_by: string;
  created_at: string;
  delivered_at: string | null;
}

@Injectable()
export class HandoversService {
  constructor(
    private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  async package(orgId: string, projectId: string): Promise<HandoverRow | null> {
    const { rows } = await this.db.query<HandoverRow>(
      'SELECT id, org_id, project_id, title, status, created_by, created_at, delivered_at FROM handover_package WHERE org_id = $1 AND project_id = $2',
      [orgId, projectId],
    );
    return rows[0] ?? null;
  }

  async create(orgId: string, createdBy: string, projectId: string, title: string): Promise<HandoverRow> {
    return this.db.one<HandoverRow>(
      `INSERT INTO handover_package (id, org_id, project_id, title, created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, org_id, project_id, title, status, created_by, created_at, delivered_at`,
      [randomUUID(), orgId, projectId, title, createdBy],
    );
  }

  async items(orgId: string, packageId: string) {
    const { rows } = await this.db.query(
      `SELECT hi.id, hi.version_id, hi.licence, hi.source_included, hi.notes,
              v.label, v.version, v.deliverable_id, v.uri, v.status AS version_status
       FROM handover_item hi JOIN version v ON v.id = hi.version_id AND v.org_id = $1
       WHERE hi.package_id = $2
       ORDER BY v.deliverable_id, v.version`,
      [orgId, packageId],
    );
    return rows;
  }

  /** Only approved versions may enter the handover package. */
  async addItem(orgId: string, packageId: string, versionId: string, input: { licence?: string; sourceIncluded?: boolean; notes?: string }) {
    const v = await this.db.oneOrNull<{ status: string }>(
      'SELECT status FROM version WHERE org_id = $1 AND id = $2',
      [orgId, versionId],
    );
    if (!v) throw new NotFoundException('version not found');
    if (v.status !== 'approved') {
      throw new ConflictException(`version must be approved to enter handover (currently: ${v.status})`);
    }
    return this.db.one(
      `INSERT INTO handover_item (id, package_id, version_id, licence, source_included, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, version_id, licence, source_included, notes`,
      [randomUUID(), packageId, versionId, input.licence ?? null, input.sourceIncluded ?? false, input.notes ?? null],
    );
  }

  /** Mark package ready → delivered; notifies client approvers. */
  async setStatus(orgId: string, packageId: string, status: 'ready' | 'delivered') {
    const row = await this.db.oneOrNull(
      'UPDATE handover_package SET status = $3, delivered_at = CASE WHEN $3 = \'delivered\' THEN now() ELSE delivered_at END WHERE org_id = $1 AND id = $2 RETURNING id, org_id, project_id, title, status, created_by, created_at, delivered_at',
      [orgId, packageId, status],
    );
    if (!row) throw new NotFoundException('handover package not found');
    if (status === 'delivered') {
      const { rows: approvers } = await this.db.query<{ person_id: string }>(
        `SELECT rb.person_id FROM role_binding rb JOIN person p ON p.id = rb.person_id
         WHERE p.org_id = $1 AND rb.role = 'client_approver'`,
        [orgId],
      );
      for (const a of approvers) {
        await this.notifications.emit(orgId, a.person_id, 'handover_delivered', 'handover_package', packageId, 'Handover package delivered');
      }
    }
    return row;
  }
}
