import {readdir} from 'node:fs/promises';
// Local browser fixture only: no real credentials, dotenv files or remote bindings.
// Clear inherited credentials before the Cloudflare plugin imports process.env.
if((await readdir('.')).some(name=>name==='.dev.vars'||name.startsWith('.dev.vars.')||name==='.env'||name.startsWith('.env.')&&name!=='.env.example'))throw new Error('The isolated UI fixture refuses existing private environment files.');
const retained=new Set(['PATH','HOME','USER','TMPDIR','SHELL','CI','CODEX_SANDBOX','LANG','LC_ALL','SYSTEMROOT']);
for(const key of Object.keys(process.env))if(!retained.has(key))delete process.env[key];
// Wrangler imports process.env in this step; the check above guarantees no dotenv file exists.
Object.assign(process.env,{
 CLOUDFLARE_INCLUDE_PROCESS_ENV:'true',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'true',
 SPRACHWELTEN_OFFLINE_PREVIEW:'1',WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:'https://sprach-pilot.test',WORLDS_PILOT_DATABASE_HOST:'ep-qa.neon.tech',
 DATABASE_URL:'postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel',NEON_AUTH_BASE_URL:'https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth',
 NEON_AUTH_COOKIE_SECRET:'synthetic-configuration-only-at-least-32-characters',WORLDS_CLIENT_ID:'fixture',WORLDS_ISSUER:'https://issuer.test/auth',WORLDS_RESOURCE:'https://sprach-pilot.test/api',
});
const {createServer}=await import('vite');
const server=await createServer({envDir:false,server:{port:5186,strictPort:true}});
await server.listen();server.printUrls();
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void server.close().finally(()=>process.exit(0));});
