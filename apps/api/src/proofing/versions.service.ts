import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface VersionRow {
  id: string;
  deliverable_id: string;
  version: number;
  label: string;
  uri: string;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
}

export interface QaItemRow {
  id: string;
  label: string;
  kind: string;
  passed: boolean;
  note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

@Injectable()
export class VersionsService {
  constructor(private readonly db: Database) {}

  async list(orgId: string, deliverableId: string): Promise<VersionRow[]> {
    const { rows } = await this.db.query<VersionRow>(
      'SELECT id, deliverable_id, version, label, uri, notes, status, created_by, created_at FROM version WHERE org_id = $1 AND deliverable_id = $2 ORDER BY version',
      [orgId, deliverableId],
    );
    return rows;
  }

  private async mustGet(orgId: string, id: string): Promise<VersionRow> {
    const row = await this.db.oneOrNull<VersionRow>(
      'SELECT id, deliverable_id, version, label, uri, notes, status, created_by, created_at FROM version WHERE org_id = $1 AND id = $2',
      [orgId, id],
    );
    if (!row) throw new NotFoundException('version not found');
    return row;
  }

  async create(orgId: string, createdBy: string, deliverableId: string, input: { label: string; uri: string; notes?: string }): Promise<VersionRow> {
    const { rows } = await this.db.query<{ next: number }>(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM version WHERE org_id = $1 AND deliverable_id = $2',
      [orgId, deliverableId],
    );
    const version = rows[0].next;
    return this.db.one<VersionRow>(
      `INSERT INTO version (id, org_id, deliverable_id, version, label, uri, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, deliverable_id, version, label, uri, notes, status, created_by, created_at`,
      [randomUUID(), orgId, deliverableId, version, input.label, input.uri, input.notes ?? null, createdBy],
    );
  }

  async qa(orgId: string, versionId: string): Promise<QaItemRow[]> {
    await this.mustGet(orgId, versionId);
    const { rows } = await this.db.query<QaItemRow>(
      'SELECT id, label, kind, passed, note, checked_by, checked_at FROM qa_checklist WHERE org_id = $1 AND version_id = $2 ORDER BY kind, label',
      [orgId, versionId],
    );
    return rows;
  }

  async addQa(orgId: string, versionId: string, input: { label: string; kind?: string }): Promise<QaItemRow> {
    const v = await this.mustGet(orgId, versionId);
    if (v.status !== 'draft' && v.status !== 'under_qa') {
      throw new ConflictException(`cannot add QA to version in status '${v.status}'`);
    }
    if (v.status === 'draft') {
      await this.db.query("UPDATE version SET status = 'under_qa' WHERE org_id = $1 AND id = $2", [orgId, versionId]);
    }
    return this.db.one<QaItemRow>(
      `INSERT INTO qa_checklist (id, org_id, version_id, label, kind)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, label, kind, passed, note, checked_by, checked_at`,
      [randomUUID(), orgId, versionId, input.label, input.kind ?? 'technical'],
    );
  }

  async checkQa(orgId: string, versionId: string, itemId: string, checkedBy: string, passed: boolean, note?: string): Promise<QaItemRow> {
    const row = await this.db.oneOrNull<QaItemRow>(
      `UPDATE qa_checklist SET passed = $4, checked_by = $5, checked_at = now(), note = $6
       WHERE org_id = $1 AND version_id = $2 AND id = $3
       RETURNING id, label, kind, passed, note, checked_by, checked_at`,
      [orgId, versionId, itemId, passed, checkedBy, note ?? null],
    );
    if (!row) throw new NotFoundException('qa item not found');
    return row;
  }

  /** QA gate — all items must pass before client review (fails closed). */
  async qaComplete(orgId: string, versionId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ total: number; failed: number }>(
      'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE NOT passed)::int AS failed FROM qa_checklist WHERE org_id = $1 AND version_id = $2',
      [orgId, versionId],
    );
    return rows[0].total > 0 && rows[0].failed === 0;
  }

  /* P6-05: annotated feedback pinned to a version + version compare. */

  async annotations(orgId: string, versionId: string) {
    await this.mustGet(orgId, versionId);
    const { rows } = await this.db.query(
      `SELECT a.id, a.x, a.y, a.body, a.resolved, a.created_at, p.name AS author
       FROM annotation a JOIN person p ON p.id = a.author_id
       WHERE a.org_id = $1 AND a.version_id = $2
       ORDER BY a.created_at`,
      [orgId, versionId],
    );
    return rows;
  }

  async addAnnotation(orgId: string, authorId: string, versionId: string, input: { x?: number; y?: number; body: string }) {
    await this.mustGet(orgId, versionId);
    return this.db.one(
      `INSERT INTO annotation (id, org_id, version_id, author_id, x, y, body)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, x, y, body, resolved, created_at`,
      [randomUUID(), orgId, versionId, authorId, input.x ?? null, input.y ?? null, input.body],
    );
  }

  async resolveAnnotation(orgId: string, versionId: string, annotationId: string, resolved: boolean) {
    const row = await this.db.oneOrNull(
      `UPDATE annotation SET resolved = $4
       WHERE org_id = $1 AND version_id = $2 AND id = $3
       RETURNING id, resolved`,
      [orgId, versionId, annotationId, resolved],
    );
    if (!row) throw new NotFoundException('annotation not found');
    return row;
  }

  /** Compare two versions: metadata + QA tally + open annotation count each. */
  async compare(orgId: string, deliverableId: string, aId: string, bId: string) {
    const summarize = async (id: string) => {
      const v = await this.mustGet(orgId, id);
      if (v.deliverable_id !== deliverableId) throw new NotFoundException('version not in deliverable');
      const qa = await this.db.query<{ total: string; passed: string }>(
        'SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE passed) AS passed FROM qa_checklist WHERE org_id = $1 AND version_id = $2',
        [orgId, id],
      );
      const ann = await this.db.query<{ open: string }>(
        'SELECT COUNT(*) FILTER (WHERE NOT resolved) AS open FROM annotation WHERE org_id = $1 AND version_id = $2',
        [orgId, id],
      );
      return {
        id: v.id,
        version: v.version,
        label: v.label,
        status: v.status,
        notes: v.notes,
        qa_total: Number(qa.rows[0].total),
        qa_passed: Number(qa.rows[0].passed),
        open_annotations: Number(ann.rows[0].open),
      };
    };
    return { a: await summarize(aId), b: await summarize(bId) };
  }
}
