import {neon,type NeonQueryFunction} from '@neondatabase/serverless';
// Protect snapshots, including future cards, until the room expires. Deleted
// entries retain their clips so that administrative restore remains lossless.
export const roomAudioReference=`EXISTS (SELECT 1 FROM game_rooms r WHERE r.expires_at>now() AND jsonb_path_exists(r.state,'$.**.audioId ? (@ == $id)',jsonb_build_object('id',a.id::text)))`;
export async function queueUnusedAudio(sql:NeonQueryFunction<false,false>,owner?:{id:string;audioId:string}){
 return await sql.query(`WITH candidates AS MATERIALIZED (
 SELECT a.id FROM pronunciation_audio a WHERE ${owner?'a.id=$1::uuid AND a.owner_id=$2':"a.created_at<now()-interval '7 days'"}
 AND NOT EXISTS(SELECT 1 FROM content_entries e WHERE e.audio_id=a.id)
 AND NOT EXISTS(SELECT 1 FROM entry_suggestions s WHERE s.audio_id=a.id OR (s.status='pending' AND s.payload->>'audioId'=a.id::text))
 AND NOT ${roomAudioReference}
 AND (SELECT count(*) FROM audio_deletion_queue)<100
 ORDER BY a.created_at LIMIT 50 FOR UPDATE OF a SKIP LOCKED
 ), removed AS (DELETE FROM pronunciation_audio a USING candidates c WHERE a.id=c.id RETURNING a.storage_key),
 budget AS (UPDATE audio_upload_budget SET clips=greatest(0,clips-(SELECT count(*)::integer FROM removed)) WHERE key='global'),
 queued AS (INSERT INTO audio_deletion_queue(storage_key) SELECT storage_key FROM removed ON CONFLICT DO NOTHING RETURNING storage_key)
 SELECT storage_key FROM queued`,owner?[owner.audioId,owner.id]:[]);
}
export async function drainAudioQueue(sql:NeonQueryFunction<false,false>,bucket:Pick<R2Bucket,'delete'>){
 const queued=await sql`SELECT storage_key FROM audio_deletion_queue ORDER BY queued_at LIMIT 50`;
 if(!queued.length)return {deleted:0,retry:0};
 // A single R2 batch and SQL acknowledgement keep daily maintenance within
 // the free Worker's subrequest budget. Both operations are safe to retry.
 const keys=queued.map(row=>row.storage_key as string);
 try{await bucket.delete(keys);await sql`DELETE FROM audio_deletion_queue WHERE storage_key=ANY(${keys}::text[])`;return {deleted:keys.length,retry:0};}
 catch{return {deleted:0,retry:keys.length};}
}
export async function maintainAudio(databaseUrl:string,bucket:R2Bucket){
 const sql=neon(databaseUrl);await queueUnusedAudio(sql);return drainAudioQueue(sql,bucket);
}
