import {validateRegion} from './regions';
import {database,fields,withLanguageNames,findDuplicateEntry} from './repository';
import type {EntryInput} from '@/lib/content';
import type {AdminEntry,AdminUser} from '@/lib/admin-types';
import {GameError} from '@/lib/game';
import {otherLocale,storedTranslation} from '@/lib/content-translations';
import {DuplicateEntryError} from '@/lib/entry-duplicates';
import {audioBucket} from '@/lib/audio-storage';
export async function adminEntries(search:string,removed:boolean,offset:number){
 const rows=await database().query(`SELECT ${fields},deleted_at as "deletedAt",author_id as "authorId" FROM content_entries WHERE (deleted_at IS NOT NULL)=$1 AND ($2='' OR phrase ILIKE '%'||$2||'%' OR literal ILIKE '%'||$2||'%' OR meaning ILIKE '%'||$2||'%' OR credit_name ILIKE '%'||$2||'%') ORDER BY created_at DESC,id LIMIT 31 OFFSET $3`,[removed,search,offset]);
 return {entries:(rows.slice(0,30) as AdminEntry[]).map(withLanguageNames),more:rows.length>30};
}
export async function adminUsers(search:string,offset:number){
 const rows=await database().query(`SELECT u.id,u.name,u.email,u."emailVerified",u."createdAt",(SELECT max(s."createdAt") FROM neon_auth.session s WHERE s."userId"=u.id) AS "lastSignIn",EXISTS(SELECT 1 FROM app_admins a WHERE a.user_id=u.id) AS "isAdmin" FROM neon_auth."user" u WHERE ($1='' OR u.email ILIKE '%'||$1||'%' OR u.name ILIKE '%'||$1||'%') ORDER BY u."createdAt" DESC,u.id LIMIT 31 OFFSET $2`,[search,offset]);
 return {users:rows.slice(0,30) as AdminUser[],more:rows.length>30};
}
export async function editAdminEntry(id:string,input:EntryInput,revision:number,adminId:string,options:{ownerOnly?:boolean;reviewId?:string;reviewRevision?:number;reviewNote?:string;reviewFeedback?:string;audioOwnerId?:string}={}){
 await validateRegion(input);
 const sql=database();const [current]=await sql`SELECT audio_id,revision,author_id FROM content_entries WHERE id=${id} AND deleted_at IS NULL`;
 if(!current)throw new GameError('Dieser Beitrag wurde nicht gefunden.',404);
 if(options.ownerOnly&&current.author_id!==adminId)throw new GameError('Du kannst nur eigene Beiträge direkt bearbeiten.',403);
 let hash:string|null=null;
 if(input.audioId){
  const [audio]=await sql`SELECT content_hash,storage_key FROM pronunciation_audio WHERE id=${input.audioId} AND (owner_id=${options.audioOwnerId??adminId} OR owner_id=${adminId} OR id=${current.audio_id??null})`;
  if(!audio)throw new GameError('Diese Aufnahme gehört nicht zu deinem Beitrag.',422);
  hash=audio.content_hash as string|null;
  if(!hash){const object=await (await audioBucket())?.get(audio.storage_key as string);if(!object)throw new GameError('Bitte die Aufnahme erneut hochladen.',422);hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await object.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');await sql`UPDATE pronunciation_audio SET content_hash=${hash} WHERE id=${input.audioId}`;}
 }
 const locale=input.sourceLocale??'de',translation=storedTranslation(input,input.translation),translations=translation?{[otherLocale(locale)]:translation}:{};
 try {
  const result=await sql.transaction([
   sql.query(`WITH review_lock AS (SELECT id FROM entry_suggestions WHERE id=$24::uuid AND revision=$25 AND status='pending' AND entry_id=$1 FOR UPDATE), changed AS (UPDATE content_entries SET kind=$2,phrase=$3,language=$4,literal=$5,meaning=$6,example=$7,region=$8,cultural_note=$9,context=$10,source_url=$11,source_locale=$12,translations=$13::jsonb,region_id=$14,context_id=$15,credit_name=$16,audio_id=$17,challenge=$18::jsonb,presentation=$19,audio_hash=$20,sense=$28,revision=revision+1,updated_at=now() WHERE id=$1 AND revision=$21 AND deleted_at IS NULL AND (NOT $23::boolean OR author_id=$22::text) AND ($24::uuid IS NULL OR EXISTS(SELECT 1 FROM review_lock)) RETURNING id), logged AS (INSERT INTO moderation_events(admin_id,entry_id,action) SELECT $22::uuid,id,CASE WHEN $23::boolean THEN 'edit-own' ELSE 'edit' END FROM changed), reviewed AS (UPDATE entry_suggestions SET status='accepted',payload=$26::jsonb,reviewer_id=$22::uuid,reviewed_at=now(),revision=revision+1,admin_note=$27,review_feedback=$29,audio_id=NULL WHERE id=$24::uuid AND EXISTS(SELECT 1 FROM changed)) SELECT id FROM changed`,[id,input.kind,input.phrase,input.language,input.literal,input.meaning,input.example,input.region,input.culturalNote,input.context,input.sourceUrl,locale,JSON.stringify(translations),input.regionId??null,input.contextId??null,input.creditName,input.audioId??null,input.challenge?JSON.stringify(input.challenge):null,input.presentation,hash,revision,adminId,!!options.ownerOnly,options.reviewId??null,options.reviewRevision??0,JSON.stringify(input),options.reviewNote??'',input.sense,options.reviewFeedback??''])
  ]);
  if(!result[0].length)throw new GameError('Der Beitrag wurde inzwischen geändert. Bitte lade die Liste neu.',409);
 }catch(error){if((error as {code?:string}).code==='23505')throw new DuplicateEntryError(await findDuplicateEntry({...input,audioHash:hash??undefined,...(input.challenge?.type==='attribution'?{attributionCategory:input.challenge.category}:{}),...(input.challenge?.type==='order'?{targetLanguage:input.challenge.targetLanguage}:{}),...(input.challenge?.type==='friends'?{otherLanguage:input.challenge.otherLanguage,otherWord:input.challenge.otherWord}:{})}));throw error;}
}
export async function moderateEntry(id:string,revision:number,removed:boolean,adminId:string,ownerOnly=false){
 try{
 const rows=await database().query(`WITH changed AS (UPDATE content_entries SET deleted_at=CASE WHEN $3 THEN now() ELSE NULL END,revision=revision+1 WHERE id=$1 AND revision=$2 AND (deleted_at IS NOT NULL)<>$3 AND (NOT $5::boolean OR author_id=$4::text) RETURNING id) INSERT INTO moderation_events(admin_id,entry_id,action) SELECT $4::uuid,id,CASE WHEN $5::boolean THEN 'remove-own' WHEN $3 THEN 'remove' ELSE 'restore' END FROM changed RETURNING entry_id`,[id,revision,removed,adminId,ownerOnly]);
 if(!rows.length)throw new GameError('Der Beitrag wurde inzwischen geändert. Bitte lade die Liste neu.',409);
 }catch(error){if((error as {code?:string}).code==='23505')throw new GameError('Dieser Ausdruck ist bereits wieder vorhanden. Der entfernte Beitrag kann nicht doppelt wiederhergestellt werden.',409);throw error;}
}
