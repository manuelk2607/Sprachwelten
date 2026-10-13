import { neon } from '@neondatabase/serverless';
import { readFile, readdir } from 'node:fs/promises';
const url=process.env.DATABASE_URL_UNPOOLED;
if(!url)throw new Error('DATABASE_URL_UNPOOLED fehlt.');
const sql=neon(url);
await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const directory=new URL('../db/migrations/',import.meta.url);
for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()) {
  if((await sql`SELECT name FROM schema_migrations WHERE name=${name}`).length)continue;
  const migration=await readFile(new URL(name,directory),'utf8');
  await sql.transaction([...migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s,[])),sql`INSERT INTO schema_migrations(name) VALUES (${name})`]);
  console.log(`Migration ${name} erfolgreich.`);
}
