import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface SavedViewRow {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  kind: string;
  filters: Record<string, unknown>;
  shared: boolean;
  created_at: string;
}

/**
 * P8-04 saved views: named board/list/calendar filters scoped to a project,
 * owner-scoped by default with an explicit share toggle. Listing returns the
 * owner's views plus any shared views for that project.
 */
@Injectable()
export class ViewsService {
  constructor(private readonly db: Database) {}

  async list(orgId: string, projectId: string, ownerId: string): Promise<SavedViewRow[]> {
    const { rows } = await this.db.query<SavedViewRow>(
      `SELECT id, project_id, owner_id, name, kind, filters, shared, created_at
       FROM saved_view WHERE org_id = $1 AND project_id = $2 AND (owner_id = $3 OR shared)
       ORDER BY created_at`,
      [orgId, projectId, ownerId],
    );
    return rows.map((r) => ({ ...r, filters: r.filters ?? {} }));
  }

  async create(
    orgId: string,
    ownerId: string,
    input: { projectId: string; name: string; kind?: string; filters?: Record<string, unknown>; shared?: boolean },
  ): Promise<SavedViewRow> {
    const row = await this.db.one<SavedViewRow>(
      `INSERT INTO saved_view (id, org_id, project_id, owner_id, name, kind, filters, shared)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, project_id, owner_id, name, kind, filters, shared, created_at`,
      [randomUUID(), orgId, input.projectId, ownerId, input.name, input.kind ?? 'board', JSON.stringify(input.filters ?? {}), input.shared ?? false] as never[],
    );
    return { ...row, filters: row.filters ?? {} };
  }

  async patch(
    orgId: string,
    id: string,
    input: { name?: string; kind?: string; filters?: Record<string, unknown>; shared?: boolean },
  ): Promise<SavedViewRow> {
    const current = await this.get(orgId, id);
    const row = await this.db.one<SavedViewRow>(
      `UPDATE saved_view SET name = $3, kind = $4, filters = $5, shared = $6
       WHERE org_id = $1 AND id = $2
       RETURNING id, project_id, owner_id, name, kind, filters, shared, created_at`,
      [orgId, id, input.name ?? current.name, input.kind ?? current.kind, JSON.stringify(input.filters ?? current.filters), input.shared ?? current.shared] as never[],
    );
    return { ...row, filters: row.filters ?? {} };
}

  private async get(orgId: string, id: string): Promise<SavedViewRow> {
    const row = await this.db.oneOrNull<SavedViewRow>(
      `SELECT id, project_id, owner_id, name, kind, filters, shared, created_at
       FROM saved_view WHERE org_id = $1 AND id = $2`,
      [orgId, id],
    );
    if (!row) throw new NotFoundException('saved view not found');
    return { ...row, filters: row.filters ?? {} };
}
}
