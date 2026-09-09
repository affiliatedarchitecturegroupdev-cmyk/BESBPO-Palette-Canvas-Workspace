import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';
import { AuditService } from '../audit/audit.service';

export interface ExportLogRow {
  id: string;
  kind: string;
  format: string;
  row_count: number | null;
  exported_by: string;
  created_at: string;
}

/** P8-11 data export log: append-only record of ad-hoc exports. */
@Injectable()
export class ExportsService {
  constructor(
    private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async list(orgId: string): Promise<ExportLogRow[]> {
    const { rows } = await this.db.query<ExportLogRow>(
      `SELECT id, kind, format, row_count, exported_by, created_at
       FROM export_log WHERE org_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [orgId],
    );
    return rows;
}

  async record(
    orgId: string,
    exportedBy: string,
    input: { kind: string; format: string; rowCount?: number },
  ): Promise<ExportLogRow> {
    const row = await this.db.one<ExportLogRow>(
      `INSERT INTO export_log (id, org_id, kind, format, row_count, exported_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, kind, format, row_count, exported_by, created_at`,
      [randomUUID(), orgId, input.kind, input.format, input.rowCount ?? null, exportedBy] as never[],
    );
    await this.audit.log(orgId, exportedBy, 'export.recorded', 'export', row.id,  {
      kind: input.kind,
      format: input.format,
    });
    return row;
}
}
