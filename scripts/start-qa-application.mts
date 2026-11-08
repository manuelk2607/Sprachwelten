import {readdir} from 'node:fs/promises';
import {isolatedAuthTarget,isolatedDatabaseTarget} from '../lib/qa-target.ts';
const database=isolatedDatabaseTarget(process.env),auth=isolatedAuthTarget(process.env);
if((await readdir('.')).some(name=>name==='.dev.vars'||name.startsWith('.dev.vars.')||name==='.env'||name.startsWith('.env.')&&name!=='.env.example'))throw new Error('QA server refuses private environment files.');
const retained=new Set(['PATH','HOME','USER','TMPDIR','SHELL','CI','LANG','LC_ALL','SYSTEMROOT']);
for(const key of Object.keys(process.env))if(!retained.has(key))delete process.env[key];
Object.assign(process.env,{
 DATABASE_URL:database.href,DATABASE_URL_UNPOOLED:database.href,NEON_AUTH_BASE_URL:auth.href,
 NEON_AUTH_COOKIE_SECRET:crypto.randomUUID()+crypto.randomUUID(),
 CLOUDFLARE_INCLUDE_PROCESS_ENV:'true',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'true',SPRACHWELTEN_OFFLINE_PREVIEW:'1',
});
const {createServer}=await import('vite');
const server=await createServer({envDir:false,server:{port:5187,strictPort:true}});
await server.listen();
console.log('Isolated QA application ready on loopback port 5187.');
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void server.close().finally(()=>process.exit(0));});
