import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {queueUnusedAudio,drainAudioQueue} from '../db/audio-maintenance';
const host=process.env.TEST_DATABASE_HOST;assert.ok(host&&new URL(process.env.DATABASE_URL_UNPOOLED!).hostname===host,'Isolated QA database required.');
const sql=neon(process.env.DATABASE_URL_UNPOOLED!),ids:string[]=[],keys:string[]=[],entryId=crypto.randomUUID(),suggestions:string[]=[],code='Q'+crypto.randomUUID().replace(/-/g,'').slice(0,5).toUpperCase();
async function clip(old=true){const id=crypto.randomUUID(),key='qa-retention/'+id+'.wav';ids.push(id);keys.push(key);await sql`INSERT INTO pronunciation_audio(id,owner_id,storage_key,byte_size,duration_ms,created_at) VALUES (${id},'qa-retention',${key},32044,1000,now()-${old?8:0}*interval '1 day')`;return id;}
try{
 const recent=await clip(false),orphan=await clip(),deleted=await clip(),pending=await clip(),rejected=await clip(),future=await clip();
 await sql`INSERT INTO audio_upload_budget(key,clips) VALUES ('global',6) ON CONFLICT(key) DO UPDATE SET clips=audio_upload_budget.clips+6`;
 await sql`INSERT INTO content_entries(id,kind,phrase,language,literal,meaning,author_name,audio_id,presentation,deleted_at) VALUES (${entryId},'word',${'QA retention '+entryId},'en','Test','Test','QA',${deleted},'both',now())`;
 for(const [audio,status] of [[pending,'pending'],[rejected,'rejected']] as const){const id=crypto.randomUUID();suggestions.push(id);await sql`INSERT INTO entry_suggestions(id,entry_id,author_id,author_name,base_revision,payload,status,audio_id) VALUES (${id},${entryId},'qa-retention','QA',0,${JSON.stringify({audioId:audio})}::jsonb,${status},${status==='pending'?audio:null})`;}
 await sql`INSERT INTO game_rooms(code,state) VALUES (${code},${JSON.stringify({players:[],prompts:[{audioId:future}],round:null})}::jsonb)`;
 await queueUnusedAudio(sql);
 const remaining=(await sql`SELECT id FROM pronunciation_audio WHERE id=ANY(${ids}::uuid[])`).map(r=>r.id);
 for(const id of [recent,deleted,pending,future])assert.ok(remaining.includes(id),'Referenced or recent clip retained: '+id);
 for(const id of [orphan,rejected])assert.ok(!remaining.includes(id),'Old unreferenced clip queued: '+id);
 const key=keys[ids.indexOf(orphan)];assert.ok((await sql`SELECT storage_key FROM audio_deletion_queue WHERE storage_key=${key}`).length);
 const failed=await drainAudioQueue(sql,{delete:async()=>{throw new Error('simulated R2 outage');}});assert.ok(failed.retry>=2);assert.ok((await sql`SELECT storage_key FROM audio_deletion_queue WHERE storage_key=${key}`).length,'Retry queue survives storage failure');
 // Drain only our synthetic keys; never remove unrelated QA storage in this test.
 await drainAudioQueue(sql,{delete:async key=>{assert.equal(typeof key,'string');if(!keys.includes(key as string))throw new Error('Not a test object');}});
 await sql`UPDATE game_rooms SET expires_at=now()-interval '1 second' WHERE code=${code}`;await queueUnusedAudio(sql);assert.equal((await sql`SELECT id FROM pronunciation_audio WHERE id=${future}`).length,0,'Expired rooms release snapshots');
 console.log('PASS: 7-day grace, deleted-entry restore, pending/rejected suggestions, future cards, expired rooms and durable storage retries.');
}finally{
 await sql`DELETE FROM game_rooms WHERE code=${code}`;await sql`DELETE FROM entry_suggestions WHERE id=ANY(${suggestions}::uuid[])`;await sql`DELETE FROM content_entries WHERE id=${entryId}`;
 const removed=await sql`DELETE FROM pronunciation_audio WHERE id=ANY(${ids}::uuid[]) RETURNING id`;await sql`UPDATE audio_upload_budget SET clips=greatest(0,clips-${removed.length}) WHERE key='global'`;
 await sql`DELETE FROM audio_deletion_queue WHERE storage_key=ANY(${keys}::text[])`;
}
