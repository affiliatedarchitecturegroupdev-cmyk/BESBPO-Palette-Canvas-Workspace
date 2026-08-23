import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface TemplateDefinition {
  phases: string[];
  requiredBriefFields: { name: string; label: string; type: 'text' | 'textarea' }[];
  deliverables: string[];
  qualityChecks: string[];
  slaTargets: { triageHours: number };
  approvalSteps: string[];
  handoverRequirements: string[];
}

export interface TemplateRow {
  id: string;
  org_id: string;
  key: string;
  name: string;
  version: number;
  definition: TemplateDefinition;
}

@Injectable()
export class TemplatesService {
  constructor(private readonly db: Database) {}

  async list(orgId: string): Promise<TemplateRow[]> {
    const { rows } = await this.db.query<TemplateRow>(
      `SELECT DISTINCT ON (key) * FROM service_template
       WHERE org_id = $1 ORDER BY key, version DESC`,
      [orgId],
    );
    return rows;
  }

  async get(orgId: string, id: string): Promise<TemplateRow | null> {
    return this.db.oneOrNull<TemplateRow>(
      'SELECT * FROM service_template WHERE org_id = $1 AND id = $2',
      [orgId, id],
    );
  }

  /** Creates a new version so in-flight projects keep their snapshot. */
  async createVersion(
    orgId: string,
    key: string,
    name: string,
    definition: TemplateDefinition,
  ): Promise<TemplateRow> {
    const existing = await this.db.oneOrNull<{ max: number }>(
      'SELECT MAX(version) AS max FROM service_template WHERE org_id = $1 AND key = $2',
      [orgId, key],
    );
    const version = (existing?.max ?? 0) + 1;
    return this.db.one<TemplateRow>(
      `INSERT INTO service_template (id, org_id, key, name, version, definition)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), orgId, key, name, version, JSON.stringify(definition)],
    );
  }
}
