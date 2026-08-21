import { Injectable } from '@nestjs/common';
import { Database } from '../db/database';

export interface WorkstreamRow {
  id: string;
  project_id: string;
  name: string;
  status: string;
}

@Injectable()
export class WorkstreamsService {
  constructor(private readonly db: Database) {}

  async list(projectId: string): Promise<WorkstreamRow[]> {
    const { rows } = await this.db.query<WorkstreamRow>(
      'SELECT id, project_id, name, status FROM workstream WHERE project_id = $1 ORDER BY created_at',
      [projectId],
    );
    return rows;
  }

  async create(projectId: string, name: string, id: string): Promise<WorkstreamRow> {
    return this.db.one<WorkstreamRow>(
      'INSERT INTO workstream (id, project_id, name) VALUES ($1,$2,$3) RETURNING id, project_id, name, status',
      [id, projectId, name],
    );
  }
}
