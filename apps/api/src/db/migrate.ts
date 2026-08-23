import { Pool } from 'pg';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Idempotent migration runner — executes migrations/*.sql in lexicographic
 * order and records applied files in schema_migrations. Used at boot, in
 * tests, and by `npm run db:migrate`.
 */
export async function migrate(pool: Pool, dir: string): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  if (!existsSync(dir)) {
    throw new Error(`migrations dir missing: ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied: string[] = [];
  for (const f of files) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE filename = $1',
      [f],
    );
    if (rowCount === 0) {
      const sql = readFileSync(join(dir, f), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      applied.push(f);
    }
  }
  return applied;
}
