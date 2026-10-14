import './sites-env.mts';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dryRun=process.argv.includes('--dry-run');
const root=process.cwd();const directory=path.join(root,'dist/server');
const config=JSON.parse(readFileSync(path.join(directory,'wrangler.json'),'utf8'));
// Generated build config is reused, with direct public routing in the owner's account.
config.name='sprachwelten';config.workers_dev=true;config.preview_urls=false;
delete config.topLevelName;delete config.routes;delete config.route;delete config.dispatch_namespaces;
const configPath=path.join(directory,'wrangler.direct.json');
writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
const temporary=mkdtempSync(path.join(tmpdir(),'sprachwelten-secrets-'));
try {
  const keys=['DATABASE_URL','NEON_AUTH_BASE_URL','NEON_AUTH_COOKIE_SECRET','DEEPL_API_KEY','DEEPL_API_URL'];
  const secrets=Object.fromEntries(keys.filter(key=>process.env[key]?.trim()).map(key=>[key,process.env[key]]));
  if(!dryRun&&keys.slice(0,3).some(key=>!secrets[key]))throw new Error('Missing required production database/auth secrets. See .env.example.');
  const secretsPath=path.join(temporary,'secrets.json');writeFileSync(secretsPath,JSON.stringify(secrets),{mode:0o600});
  const args=['node_modules/wrangler/bin/wrangler.js','deploy','--config',configPath,'--keep-vars',...(dryRun?['--dry-run']:['--secrets-file',secretsPath])];
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
}finally{rmSync(temporary,{recursive:true,force:true});}
