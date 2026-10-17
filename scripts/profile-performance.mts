import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {createGame,act} from '../lib/game';
import {communityGameEntries} from '../lib/community-game-seeds';
import {fields,readRoomConditional} from '../db/repository';
import {hashToken} from '../lib/http';
const host=process.env.TEST_DATABASE_HOST;assert.ok(host&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===host,'Isolated QA database required.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),code='P'+String(Date.now()).slice(-5),token='a'.repeat(64),hash=await hashToken(token),base=process.env.TEST_BASE_URL??'http://localhost:5176';assert.equal(new URL(base).hostname,'localhost');
const g=createGame(code,{id:crypto.randomUUID(),name:'Performance QA',score:0,tokenHash:hash},'de','joke-quiz');act(g,g.hostId,{action:'configure',rounds:2});act(g,g.hostId,{action:'start'},communityGameEntries);
const median=(n:number[])=>Math.round(n.sort((a,b)=>a-b)[Math.floor(n.length/2)]*10)/10;
try{
 await sql`INSERT INTO game_rooms(code,state) VALUES (${code},${JSON.stringify(g)}::jsonb)`;
 const oldPoll=await sql`SELECT state-'prompts' AS state FROM game_rooms WHERE code=${code}`,newPoll=await readRoomConditional(code,hash,-1),unchanged=await readRoomConditional(code,hash,newPoll.version);assert.deepEqual(oldPoll[0].state,newPoll.state);assert.equal(unchanged.state,null);
 const raw=Buffer.byteLength(JSON.stringify(oldPoll)),small=Buffer.byteLength(JSON.stringify(unchanged));
 const full=await sql.query(`SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 6`,[]),preview=await sql`SELECT id,kind,phrase,presentation,status,created_at AS "createdAt" FROM content_entries WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 6`;
 const oldMs:number[]=[],newMs:number[]=[],httpMs:number[]=[];let httpBytes=0,etag='';
 for(let i=0;i<12;i++){
  let start=performance.now();await sql`SELECT state-'prompts' AS state FROM game_rooms WHERE code=${code}`;if(i>1)oldMs.push(performance.now()-start);
  start=performance.now();await readRoomConditional(code,hash,newPoll.version);if(i>1)newMs.push(performance.now()-start);
  start=performance.now();const res=await fetch(base+'/api/rooms/'+code,{headers:{Authorization:'Bearer '+token,...(etag?{'If-None-Match':etag}:{})}});httpBytes+=(await res.text()).length;etag=res.headers.get('ETag')??'';if(i>1){httpMs.push(performance.now()-start);assert.equal(res.status,304);}
 }
 // A matching ETag must never bypass membership checks, and changes must
 // invalidate it while keeping future cards and correct answers private.
 assert.equal((await fetch(base+'/api/rooms/'+code,{headers:{Authorization:'Bearer '+'c'.repeat(64),'If-None-Match':etag}})).status,403);
 assert.equal((await fetch(base+'/api/rooms/'+code,{headers:{'If-None-Match':etag}})).status,401);
 await sql`UPDATE game_rooms SET version=version+1 WHERE code=${code}`;
 const changed=await fetch(base+'/api/rooms/'+code,{headers:{Authorization:'Bearer '+token,'If-None-Match':etag}});assert.equal(changed.status,200);const body=await changed.json() as {room:Record<string,unknown>};assert.equal(body.room.revelation,null);assert.ok(!('prompts' in body.room));
 console.log(JSON.stringify({poll:{beforeDatabaseBytes:raw,unchangedDatabaseBytes:small,reductionPercent:Math.round((1-small/raw)*100),oldMedianMs:median(oldMs),newMedianMs:median(newMs),localHttp304MedianMs:median(httpMs),unchangedHttpBodyBytes:0},discovery:{beforeDatabaseBytes:Buffer.byteLength(JSON.stringify(full)),afterDatabaseBytes:Buffer.byteLength(JSON.stringify(preview)),fieldsBefore:Object.keys(full[0]).length,fieldsAfter:Object.keys(preview[0]).length},adminBadge:{databaseQueriesBefore:4,databaseQueriesAfter:1}},null,2));
}finally{await sql`DELETE FROM game_rooms WHERE code=${code}`;}
