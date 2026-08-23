import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface AgencyRow {
  id: string;
  org_id: string;
  name: string;
  confidentiality_tier: string;
  health: string;
  created_at: string;
}

export interface BrandRow {
  id: string;
  org_id: string;
  agency_id: string;
  name: string;
  confidentiality_tier: string;
  created_at: string;
}

export interface ContactRow {
  id: string;
  agency_id: string;
  name: string;
  email: string;
  role_label: string;
}

@Injectable()
export class DirectoryService {
  constructor(private readonly db: Database) {}

  listAgencies(orgId: string, agencyFilter: string[] | null) {
    if (agencyFilter) {
      return this.db
        .query<AgencyRow>(
          'SELECT * FROM agency WHERE org_id = $1 AND id = ANY($2) ORDER BY name',
          [orgId, agencyFilter],
        )
        .then((r) => r.rows);
    }
    return this.db
      .query<AgencyRow>('SELECT * FROM agency WHERE org_id = $1 ORDER BY name', [orgId])
      .then((r) => r.rows);
  }

  async createAgency(orgId: string, name: string, tier = 'standard'): Promise<AgencyRow> {
    return this.db.one<AgencyRow>(
      'INSERT INTO agency (id, org_id, name, confidentiality_tier) VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), orgId, name, tier],
    );
  }

  async listBrands(orgId: string, agencyFilter: string[] | null): Promise<BrandRow[]> {
    const base = 'SELECT * FROM brand WHERE org_id = $1';
    if (agencyFilter) {
      const { rows } = await this.db.query<BrandRow>(
        `${base} AND agency_id = ANY($2) ORDER BY name`,
        [orgId, agencyFilter],
      );
      return rows;
    }
    const { rows } = await this.db.query<BrandRow>(`${base} ORDER BY name`, [orgId]);
    return rows;
  }

  async createBrand(orgId: string, agencyId: string, name: string): Promise<BrandRow> {
    return this.db.one<BrandRow>(
      'INSERT INTO brand (id, org_id, agency_id, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [randomUUID(), orgId, agencyId, name],
    );
  }

  async listContacts(agencyId: string): Promise<ContactRow[]> {
    const { rows } = await this.db.query<ContactRow>(
      'SELECT * FROM contact WHERE agency_id = $1 ORDER BY name',
      [agencyId],
    );
    return rows;
  }

  async createContact(
    agencyId: string,
    name: string,
    email: string,
    roleLabel = 'contact',
  ): Promise<ContactRow> {
    return this.db.one<ContactRow>(
      'INSERT INTO contact (id, agency_id, name, email, role_label) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [randomUUID(), agencyId, name, email, roleLabel],
    );
  }
}
