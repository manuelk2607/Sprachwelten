import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {isolatedAuthTarget,isolatedDatabaseTarget} from '../lib/qa-target.ts';
// Environment is supplied only by the expiring QA branch action; no secret files.
isolatedDatabaseTarget(process.env);isolatedAuthTarget(process.env);
await import('./seed.ts');
const server=spawn(process.execPath,['--import','tsx','scripts/start-qa-application.mts'],{stdio:'inherit'});
const exited=once(server,'exit');
try{
 let ready=false;
 for(let attempt=0;attempt<120;attempt++){
  if(server.exitCode!==null)throw new Error('Isolated application server exited before readiness.');
  try{const response=await fetch('http://localhost:5187/api/entries',{signal:AbortSignal.timeout(2000)});ready=response.ok;await response.body?.cancel();}catch{/* Wait for the same server; do not restart it. */}
  if(ready)break;await delay(500);
 }
 assert.ok(ready,'The isolated application did not become ready.');
 const result=spawnSync('npm',['run','test:integration'],{stdio:'inherit',env:{...process.env,TEST_BASE_URL:'http://localhost:5187'}});
 if(result.error)throw result.error;
 assert.equal(result.status,0,'Managed application HTTP integration failed.');
}finally{
 server.kill('SIGTERM');
 const closed=await Promise.race([exited.then(()=>true),delay(10_000).then(()=>false)]);
 if(!closed){server.kill('SIGKILL');await exited;}
}
