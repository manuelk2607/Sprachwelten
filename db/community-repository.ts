import {validateRegion} from './regions';
import {database,fields,withLanguageNames,getEntry} from './repository';
import {editAdminEntry} from './admin-repository';
import {storedEntryInput,type Entry,type EntryInput} from '@/lib/content';
import {categoryLabel} from '@/lib/quiz-categories';
import {GameError} from '@/lib/game';
import type {z} from 'zod';
import type {bulkInput} from '@/lib/community-input';
export async function ownsEntry(id:string,userId:string){return (await database()`SELECT id FROM content_entries WHERE id=${id} AND author_id=${userId} AND deleted_at IS NULL`).length===1;}
export async function ownEntries(userId:string,offset:number){const rows=await database().query(`SELECT ${fields} FROM content_entries WHERE author_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 31 OFFSET $2`,[userId,offset]);return {entries:(rows.slice(0,30) as Entry[]).map(withLanguageNames),more:rows.length>30};}
export async function suggestEntry(id:string,input:EntryInput,revision:number,note:string,user:{id:string;name:string}){
 await validateRegion(input);
 const existing=await getEntry(id);if(!existing)throw new GameError('Dieser Beitrag wurde nicht gefunden.',404);
 if(await ownsEntry(id,user.id))throw new GameError('Eigene Beiträge kannst du direkt bearbeiten.',422);
 if(existing.revision!==revision)throw new GameError('Der Beitrag wurde inzwischen geändert. Bitte lade die Liste neu.',409);
 if(input.audioId&&input.audioId!==existing.audioId&&!(await database()`SELECT id FROM pronunciation_audio WHERE id=${input.audioId} AND owner_id=${user.id}`).length)throw new GameError('Diese Aufnahme gehört nicht zu deinem Beitrag.',422);
 const rows=await database()`INSERT INTO entry_suggestions(entry_id,author_id,author_name,base_revision,payload,note,audio_id) VALUES (${id},${user.id},${user.name},${revision},${JSON.stringify(input)}::jsonb,${note},${input.audioId??null}) ON CONFLICT DO NOTHING RETURNING id`;
 if(!rows.length)throw new GameError('Du hast für diesen Beitrag bereits einen offenen Vorschlag.',409);
 return rows[0].id;
}
export async function pendingSuggestions(){return await database()`SELECT s.id,s.entry_id as "entryId",s.author_name as "authorName",s.payload,s.note,s.base_revision as "baseRevision",s.revision,s.created_at as "createdAt",e.phrase,e.literal,e.meaning,e.revision as "currentRevision" FROM entry_suggestions s JOIN content_entries e ON e.id=s.entry_id WHERE s.status='pending' ORDER BY s.created_at DESC LIMIT 100`;}
export async function reviewSuggestion(id:string,revision:number,action:'accept'|'reject',adminId:string,input?:EntryInput,note='',feedback=''){
 if(action==='reject'){const rows=await database()`UPDATE entry_suggestions SET status='rejected',reviewer_id=${adminId},reviewed_at=now(),admin_note=${note},review_feedback=${feedback},audio_id=NULL,revision=revision+1 WHERE id=${id} AND revision=${revision} AND status='pending' RETURNING id`;if(!rows.length)throw new GameError('Dieser Vorschlag wurde bereits bearbeitet.',409);return;}
 const [suggestion]=await database()`SELECT entry_id,base_revision,payload,author_id FROM entry_suggestions WHERE id=${id} AND revision=${revision} AND status='pending'`;
 if(!suggestion)throw new GameError('Dieser Vorschlag wurde bereits bearbeitet.',409);
 await editAdminEntry(suggestion.entry_id as string,input??storedEntryInput.parse(suggestion.payload),Number(suggestion.base_revision),adminId,{reviewId:id,reviewRevision:revision,reviewNote:note,reviewFeedback:feedback,audioOwnerId:suggestion.author_id as string});
}
export async function inbox(adminId:string){
 const [seen]=await database()`SELECT last_seen_at FROM admin_inbox_seen WHERE user_id=${adminId}`;
 const since=(seen?.last_seen_at as string|undefined)??'1970-01-01T00:00:00Z';
 const events=await database()`SELECT id,phrase,kind,created_at as "createdAt",created_at>${since}::timestamptz AS unread FROM content_entries WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 50`;
 const [count]=await database()`SELECT count(*)::int AS count FROM content_entries WHERE deleted_at IS NULL AND created_at>${since}::timestamptz`;
 const [pending]=await database()`SELECT (SELECT count(*) FROM entry_suggestions WHERE status='pending')::int AS suggestions`;
 return {events,unreadCount:Number(count.count),pendingSuggestions:Number(pending.suggestions)};
}
export async function bulkEdit(input:z.infer<typeof bulkInput>,adminId:string){
 const sql=database(),ids=input.entries.map(e=>e.id);const existing=await sql.query(`SELECT ${fields} FROM content_entries WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL`,[ids]) as Entry[];
 if(existing.length!==ids.length||existing.some(e=>e.revision!==input.entries.find(i=>i.id===e.id)?.revision))throw new GameError('Die Auswahl wurde inzwischen geändert. Bitte lade die Liste neu.',409);
 const values=[];for(const e of existing){const changed=storedEntryInput.parse({...e,kind:input.kind??e.kind,region:input.regionId?categoryLabel('region',input.regionId,'de'):e.region,context:input.contextId?categoryLabel('context',input.contextId,'de'):e.context,regionId:input.regionId??e.regionId??undefined,contextId:input.contextId??e.contextId??undefined,audioId:e.audioId??undefined,challenge:input.kind&&input.kind!==e.kind?undefined:e.challenge??undefined});await validateRegion(changed);const region=changed;values.push({id:e.id,revision:e.revision,kind:region.kind,region:region.region,region_id:region.regionId??null,context:region.context,context_id:region.contextId??null,challenge:region.challenge??null});}
 try{const rows=await sql.query(`WITH requested AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(id uuid,revision integer,kind text,region text,region_id text,context text,context_id text,challenge jsonb)), locked AS MATERIALIZED (SELECT e.id FROM content_entries e JOIN requested r ON r.id=e.id AND r.revision=e.revision WHERE e.deleted_at IS NULL ORDER BY e.id FOR UPDATE OF e), changed AS (UPDATE content_entries e SET kind=r.kind,region=r.region,region_id=r.region_id,context=r.context,context_id=r.context_id,challenge=r.challenge,revision=e.revision+1,updated_at=now() FROM requested r WHERE e.id=r.id AND e.revision=r.revision AND (SELECT count(*) FROM locked)=$2 RETURNING e.id), logged AS (INSERT INTO moderation_events(admin_id,entry_id,action) SELECT $3::uuid,id,'bulk' FROM changed) SELECT id FROM changed`,[JSON.stringify(values),ids.length,adminId]);if(rows.length!==ids.length)throw new GameError('Die Auswahl wurde inzwischen geändert. Bitte lade die Liste neu.',409);}catch(error){if((error as {code?:string}).code==='23505')throw new GameError('Die Sammeländerung würde doppelte Beiträge erzeugen. Es wurde nichts geändert.',409);throw error;}
}

export async function ownSuggestions(userId:string,offset:number){
 const rows=await database()`SELECT s.id,s.entry_id as "entryId",s.payload->>'phrase' as phrase,s.status,s.created_at as "createdAt",s.reviewed_at as "reviewedAt",s.review_feedback as feedback FROM entry_suggestions s WHERE s.author_id=${userId} ORDER BY s.created_at DESC,s.id LIMIT 31 OFFSET ${offset}`;
 return {suggestions:rows.slice(0,30),more:rows.length>30};
}

export async function inboxCount(adminId:string){
 const [row]=await database()`SELECT ((SELECT count(*) FROM content_entries WHERE deleted_at IS NULL AND created_at>coalesce((SELECT last_seen_at FROM admin_inbox_seen WHERE user_id=${adminId}),'1970-01-01'::timestamptz))+(SELECT count(*) FROM entry_suggestions WHERE status='pending'))::int AS total`;
 return Number(row.total);
}
