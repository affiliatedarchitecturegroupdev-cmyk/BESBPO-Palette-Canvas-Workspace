import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface TemplateSchemaRow {
  id: string;
   workstream_id: string;
   name: string;
   description: string | null;
   schema: unknown;
   created_by: string;
   created_at: string;
}

/** P8-13 deliverable template schemas: workstream-scoped JSON shapes
 * consumed by the deliverable wizard to prefill structure. */
@Injectable()
export class TemplateSchemasService {
  constructor(private readonly db: Database) {}

  async list(orgId: string, workstreamId: string): Promise<TemplateSchemaRow[]> {
    const { rows } = await this.db.query<TemplateSchemaRow>(
      `SELECT id, workstream_id, name, description, schema, created_by, created_at
       FROM template_schema WHERE org_id = $1 AND workstream_id = $2 ORDER BY created_at`,
      [orgId, workstreamId],
    );
    return rows;
  }

  async create(
    orgId: string,
    createdBy: string,
    workstreamId: string,
    input: { name: string; description?: string; schema: unknown },
  ): Promise<TemplateSchemaRow> {
    const row = await this.db.one<TemplateSchemaRow>(
      `INSERT INTO template_schema (id, org_id, workstream_id, name, description, schema, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, workstream_id, name, description, schema, created_by, created_at`,
      [randomUUID(), orgId, workstreamId, input.name, input.description ?? null, JSON.stringify(input.schema), createdBy] as never[],
    );
    return row;
  }

  async get(orgId: string, id: string): Promise<TemplateSchemaRow> {
    const row = await this.db.oneOrNull<TemplateSchemaRow>(
      'SELECT id, workstream_id, name, description, schema, created_by, created_at FROM template_schema WHERE org_id = $1 AND id = $2',
      [orgId, id],
    );
    if (!row) throw new NotFoundException('template schema not found');
    return { ...row, schema: JSON.parse(row.schema as unknown as string) };
  }
}