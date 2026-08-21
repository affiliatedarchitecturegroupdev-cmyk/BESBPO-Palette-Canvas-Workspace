import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { TemplatesService, TemplateDefinition } from '../templates/templates.service';

export interface BriefRow {
  id: string;
  org_id: string;
  agency_id: string;
  brand_id: string;
  template_id: string | null;
  title: string;
  fields: Record<string, unknown>;
  attachments: { label: string; url: string }[];
  requested_date: string | null;
  source_channel: string;
  confidentiality: string;
  status: string;
  duplicate_of: string | null;
  triage: unknown;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBriefInput {
  agencyId: string;
  brandId: string;
  templateId?: string;
  title: string;
  fields?: Record<string, unknown>;
  attachments?: { label: string; url: string }[];
  requestedDate?: string;
  sourceChannel?: string;
  confidentiality?: string;
}

/**
 * Intake inbox + structured briefs. Mandatory fields come from the linked
 * service template; duplicate detection flags same-title requests per brand.
 */
@Injectable()
export class IntakeService {
  constructor(
    private readonly db: Database,
    private readonly templates: TemplatesService,
  ) {}

  async listInbox(orgId: string, agencyFilter: string[] | null): Promise<BriefRow[]> {
    const base = 'SELECT * FROM brief WHERE org_id = $1';
    if (agencyFilter) {
      const { rows } = await this.db.query<BriefRow>(
        `${base} AND agency_id = ANY($2) ORDER BY created_at DESC`,
        [orgId, agencyFilter],
      );
      return rows;
    }
    const { rows } = await this.db.query<BriefRow>(`${base} ORDER BY created_at DESC`, [orgId]);
    return rows;
  }

  async get(orgId: string, id: string): Promise<BriefRow | null> {
    return this.db.oneOrNull<BriefRow>('SELECT * FROM brief WHERE org_id = $1 AND id = $2', [
      orgId,
      id,
    ]);
  }

  async create(orgId: string, userId: string, input: CreateBriefInput): Promise<BriefRow> {
    let definition: TemplateDefinition | null = null;
    if (input.templateId) {
      const template = await this.templates.get(orgId, input.templateId);
      if (!template) throw new BadRequestException('unknown template');
      definition = template.definition;
      const missing = definition.requiredBriefFields.filter((f) => !input.fields?.[f.name]);
      if (missing.length) {
        throw new BadRequestException(
          `missing required brief fields: ${missing.map((m) => m.label).join(', ')}`,
        );
      }
    }
    const { rows: duplicates } = await this.db.query<BriefRow>(
      `SELECT * FROM brief WHERE org_id = $1 AND brand_id = $2
       AND lower(title) = lower($3) AND status = 'inbox' LIMIT 1`,
      [orgId, input.brandId, input.title],
    );
    const duplicateOf = duplicates[0]?.id ?? null;
    const brief = await this.db.one<BriefRow>(
      `INSERT INTO brief
        (id, org_id, agency_id, brand_id, template_id, title, fields, attachments,
         requested_date, source_channel, confidentiality, duplicate_of, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        randomUUID(),
        orgId,
        input.agencyId,
        input.brandId,
        input.templateId ?? null,
        input.title,
        JSON.stringify(input.fields ?? {}),
        JSON.stringify(input.attachments ?? []),
        input.requestedDate ?? null,
        input.sourceChannel ?? 'web_form',
        input.confidentiality ?? 'internal',
        duplicateOf,
        userId,
      ],
    );
    return brief;
  }

  async setStatus(orgId: string, id: string, status: string): Promise<void> {
    await this.db.query('UPDATE brief SET status = $3, updated_at = now() WHERE org_id = $1 AND id = $2', [
      orgId,
      id,
      status,
    ]);
  }
}

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, '');
}
export { normalizeTitle };
