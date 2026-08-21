import { existsSync } from 'fs';
import { join } from 'path';

export const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://palette_canvas:devpassword@localhost:5432/palette_canvas';

/** Locate the migrations/ directory from any build layout (src, dist, test-dist). */
export function migrationsDir(fromDir: string): string {
  const candidates = [
    join(fromDir, '..', 'migrations'), // src/ or any one-deep dir
    join(fromDir, '..', '..', 'migrations'), // dist/ or .test-dist/
    join(fromDir, '..', '..', '..', 'migrations'), // nested test outputs
    join(process.cwd(), 'migrations'), // run from package root
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error(`migrations dir not found (from ${fromDir})`);
}
