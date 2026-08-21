import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Pool } from 'pg';
import { AppModule } from './app.module';
import { migrate } from './db/migrate';
import { DATABASE_URL, migrationsDir } from './db/paths';

async function bootstrap() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const applied = await migrate(pool, migrationsDir(__dirname));
  if (applied.length) {
    // eslint-disable-next-line no-console
    console.log(`migrations applied: ${applied.join(', ')}`);
  }
  await pool.end();

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Palette Canvas API listening on ${port}`);
}
void bootstrap();
