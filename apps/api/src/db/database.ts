import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Single connection pool for the modular monolith. Every query passes through
 * here so tenant context and (later) row-level predicates are applied in one
 * place, per the planning document's data-governance rules.
 */
@Injectable()
export class Database implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const url =
      process.env.DATABASE_URL ??
      'postgres://palette_canvas:devpassword@localhost:5432/palette_canvas';
    this.pool = new Pool({ connectionString: url });
  }

  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
    return this.pool.query(text, params) as Promise<{ rows: T[] }>;
  }

  async one<T = unknown>(text: string, params?: unknown[]): Promise<T> {
    const { rows } = await this.query<T>(text, params);
    if (rows.length !== 1) {
      throw new Error(`expected 1 row, got ${rows.length}: ${text}`);
    }
    return rows[0];
  }

  async oneOrNull<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
    const { rows } = await this.query<T>(text, params);
    return rows.length ? rows[0] : null;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
