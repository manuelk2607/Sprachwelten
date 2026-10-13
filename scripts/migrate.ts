import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
const url=process.env.DATABASE_URL_UNPOOLED;
if(!url)throw new Error('DATABASE_URL_UNPOOLED fehlt.');
const sql=neon(url);
const migration=await readFile(new URL('../db/migrations/001_initial.sql',import.meta.url),'utf8');
await sql.transaction(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s,[])));
console.log('Migration 001 erfolgreich.');
