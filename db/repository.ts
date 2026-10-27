import {validateRegion} from './regions';
import {languagePoolQuery} from './game-language-pool';
import {audioBucket} from '@/lib/audio-storage';
import {prepareAttributionEntries} from '@/lib/attribution';
import {sentencePrompts} from '@/lib/sentence-chain';
import type {RoomPoolSettings} from '@/lib/game-pool';
import { registeredLanguageNames } from '@/lib/language-registry';
import { neon } from '@neondatabase/serverless';
import type { Entry, EntryInput, Explanation } from '@/lib/content';
import type {EntryPreview} from '@/lib/content-public';
import type { Game } from '@/lib/game';
import { GameError } from '@/lib/game';
import type { PlayableGameMode } from '@/lib/modes';
import { otherLocale, storedTranslation } from '@/lib/content-translations';
import { DuplicateEntryError, type EntryIdentity, type ExistingEntry } from '@/lib/entry-duplicates';

export const database = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt.');
  return neon(process.env.DATABASE_URL);
};
export const withLanguageNames=(entry:Entry):Entry=>({...entry,challenge:entry.challenge??undefined,languageNames:registeredLanguageNames(entry.language)});
export const fields = `id, canonical_vocabulary_id AS "canonicalVocabularyId", sense, hint, phrase_markup as "phraseMarkup", (SELECT jsonb_build_object('de',r.de,'en',r.en) FROM content_regions r WHERE r.id=region_id) as "regionNames", revision, updated_at as "updatedAt", kind, presentation, challenge, phrase, language, credit_name as "creditName",audio_id as "audioId", literal, meaning, example, region, region_id as "regionId", cultural_note as "culturalNote", context, context_id as "contextId", source_locale as "sourceLocale", translations, source_url as "sourceUrl", status, author_name as "authorName", created_at as "createdAt"`;
export async function listEntries(kind = '', language = '', search = '', offset = 0) {
  const sql = database();
  return (await sql.query(`SELECT id,kind,phrase,phrase_markup AS "phraseMarkup",presentation,status,created_at AS "createdAt" FROM content_entries WHERE deleted_at IS NULL AND kind NOT IN ('taboo','vocabulary','grammar') AND ($1='' OR kind=$1) AND ($2='' OR language=$2) AND ($3='' OR phrase ILIKE '%' || $3 || '%' OR meaning ILIKE '%' || $3 || '%' OR translations #>> '{de,meaning}' ILIKE '%' || $3 || '%' OR translations #>> '{en,meaning}' ILIKE '%' || $3 || '%') ORDER BY created_at DESC, id LIMIT 6 OFFSET $4`, [kind, language, search, offset]) as EntryPreview[]);
}
export async function getEntry(id: string) {
  const sql = database(); const rows = await sql.query(`SELECT ${fields} FROM content_entries WHERE id=$1 AND deleted_at IS NULL`, [id]); return rows[0]?withLanguageNames(rows[0] as Entry):undefined;
}
export async function findDuplicateEntry(input:EntryIdentity):Promise<ExistingEntry|undefined> {
  const translationLanguage=input.translationLanguage??(input.challenge?.type==='learning'?input.challenge.vocabulary?.translationLanguage:undefined);
  if(input.kind==='vocabulary'&&translationLanguage){
    const rows=await database().query(`SELECT id,phrase FROM content_entries WHERE deleted_at IS NULL AND kind='vocabulary' AND content_phrase_key(sense)=content_phrase_key($1) AND ((lower(language)=lower($2) AND challenge->'vocabulary'->>'translationLanguage'=$3 AND content_phrase_key(phrase)=content_phrase_key($4)) OR (lower(language)=lower($3) AND challenge->'vocabulary'->>'translationLanguage'=$2 AND content_phrase_key(phrase)=content_phrase_key($5) AND content_phrase_key(literal)=content_phrase_key($4))) LIMIT 1`,[input.sense??'',input.language,translationLanguage,input.phrase,input.literal??'']);
    return rows[0] as ExistingEntry|undefined;
  }

  const scope=input.kind==='dialect'?input.regionId??'':input.kind==='situation'?input.contextId??'':input.kind==='attribution'?input.attributionCategory??'':input.kind==='word_order'?input.targetLanguage??'':input.kind==='false_friend'?(input.otherLanguage??'')+':'+(input.otherWord??''):'';
  const rows=await database()`SELECT id,phrase FROM content_entries WHERE deleted_at IS NULL AND kind=${input.kind} AND lower(language)=lower(${input.language}) AND content_phrase_key(sense)=content_phrase_key(${input.sense??''}) AND ((${input.audioHash??''}<>'' AND audio_hash=${input.audioHash??''}) OR (${input.phrase}<>'' AND presentation<>'audio' AND content_phrase_key(phrase)=content_phrase_key(${input.phrase}))) AND (CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) WHEN kind='attribution' THEN coalesce(challenge->>'category','') WHEN kind='word_order' THEN coalesce(challenge->>'targetLanguage','') WHEN kind='false_friend' THEN coalesce(challenge->>'otherLanguage','') || ':' || content_phrase_key(coalesce(challenge->>'otherWord','')) ELSE '' END)=(CASE WHEN ${input.kind}='false_friend' THEN ${input.otherLanguage??''} || ':' || content_phrase_key(${input.otherWord??''}) ELSE ${scope} END) LIMIT 1`;
  return rows[0] as ExistingEntry|undefined;
}
export async function addEntry(input: EntryInput, authorId: string, authorName: string) {
  const sql = database();
  await validateRegion(input);
  let audioHash:string|null=null;
  if(input.audioId){
    const [audio]=await sql`SELECT storage_key,content_hash FROM pronunciation_audio WHERE id=${input.audioId} AND owner_id=${authorId}`;
    if(!audio)throw new GameError('Diese Aufnahme gehört nicht zu deinem Beitrag.',422);
    audioHash=audio.content_hash as string|null;
    if(!audioHash){
      const object=await (await audioBucket())?.get(audio.storage_key as string);
      if(!object)throw new GameError('Bitte die Aufnahme erneut hochladen.',422);
      const digest=await crypto.subtle.digest('SHA-256',await object.arrayBuffer());audioHash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      await sql`UPDATE pronunciation_audio SET content_hash=${audioHash} WHERE id=${input.audioId} AND owner_id=${authorId}`;
    }
  }
  const sourceLocale=input.sourceLocale??'de';const translation=storedTranslation(input,input.translation);
  const translations=translation?{[otherLocale(sourceLocale)]:translation}:{};
  const rows = await sql.query(`INSERT INTO content_entries (kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_id,author_name,source_locale,translations,region_id,context_id,credit_name,audio_id,challenge,presentation,audio_hash,sense,hint,phrase_markup) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19::jsonb,$20,$21,$22,$23,$24) ON CONFLICT DO NOTHING RETURNING ${fields}`,
    [input.kind,input.phrase,input.language,input.literal,input.meaning,input.example,input.region,input.culturalNote,input.context,input.sourceUrl,authorId,authorName,sourceLocale,JSON.stringify(translations),input.regionId??null,input.contextId??null,input.creditName,input.audioId??null,input.challenge?JSON.stringify(input.challenge):null,input.presentation,audioHash,input.sense,input.hint,input.phraseMarkup??'']);
  if(!rows.length)throw new DuplicateEntryError(await findDuplicateEntry({...input,audioHash:audioHash??undefined,...(input.challenge?.type==='attribution'?{attributionCategory:input.challenge.category}:{}),...(input.challenge?.type==='order'?{targetLanguage:input.challenge.targetLanguage}:{}),...(input.challenge?.type==='friends'?{otherLanguage:input.challenge.otherLanguage,otherWord:input.challenge.otherWord}:{})}));
  return withLanguageNames(rows[0] as Entry);
}
export async function listExplanations(id: string) {
  return await database()`SELECT id, credit_name as "creditName", body, source_locale as "sourceLocale", translations, author_name as "authorName", created_at as "createdAt" FROM explanations WHERE entry_id=${id} ORDER BY created_at LIMIT 100` as Explanation[];
}
export async function addExplanation(id: string, input:{body:string;creditName?:string;sourceLocale?:'de'|'en';translation?:{body:string}}, authorId: string, authorName: string) {
  const sourceLocale=input.sourceLocale??'de';const translation=storedTranslation(input,input.translation);
  const translations=translation?{[otherLocale(sourceLocale)]:translation}:{};
  return await database()`INSERT INTO explanations(entry_id,body,author_id,author_name,source_locale,translations,credit_name) VALUES (${id},${input.body},${authorId},${authorName},${sourceLocale},${JSON.stringify(translations)}::jsonb,${input.creditName??''}) RETURNING id`;
}
export async function gamePrompts(mode: PlayableGameMode = 'idiom-bluff',settings:Partial<RoomPoolSettings>={}) {
  const query=(statement:string,params:unknown[])=>{const filtered=languagePoolQuery(mode,settings.gameLanguages,statement,params);return database().query(filtered.statement,filtered.params);};
  if(mode==='taboo')return (await query(`SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL AND kind='taboo' AND language=ANY($1::text[]) ORDER BY (id=ANY($2::uuid[])),random() LIMIT 240`,[settings.gameLanguages??settings.tabooLanguages??[settings.locale??'de'],(settings.playedPrompts??[]).map(p=>p.id)]) as Entry[]).map(withLanguageNames);
  if(mode==='word-chain')return sentencePrompts();
  const seenIds=[...new Set([...(settings.playedPrompts??[]).map(prompt=>prompt.id),...(settings.round?[settings.round.entry.id]:[])])];
  if(mode==='meaning-quiz'){
    const kinds=settings.meaningCategory==='expression'?['idiom','dialect']:settings.meaningCategory==='gaming'?['gaming_mission']:settings.meaningCategory==='youth'?['youth_chat']:settings.meaningCategory==='academic'?['academic']:['idiom','dialect','gaming_mission','youth_chat','academic'];
    return (await query(`SELECT ${fields} FROM (SELECT *,row_number() OVER (PARTITION BY kind ORDER BY (id=ANY($2::uuid[])),random()) AS sample_rank FROM content_entries WHERE deleted_at IS NULL AND kind=ANY($1::text[])) sampled WHERE sample_rank<=50`,[kinds,seenIds]) as Entry[]).map(withLanguageNames);
  }
  const newKinds={'gaming-call':'gaming_mission','generation-chat':'youth_chat','plain-talk':'academic','who-said-it':'attribution','false-friends':'false_friend','word-builder':'word_order','joke-quiz':'joke','word-outsider':'word_group','loanword-quiz':'loanword'} as const;
  if(mode in newKinds){const category=mode==='who-said-it'&&settings.attributionCategory&&settings.attributionCategory!=='both'?settings.attributionCategory:'';const entries=(await query(`SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL AND kind=$1 AND ($2='' OR challenge->>'category'=$2) ORDER BY (id=ANY($3::uuid[])),random() LIMIT 120`,[newKinds[mode as keyof typeof newKinds],category,seenIds]) as Entry[]).map(withLanguageNames);return mode==='who-said-it'?prepareAttributionEntries(entries):mode==='gaming-call'&&entries.some(e=>e.challenge?.type==='relay')?entries.filter(e=>e.challenge?.type==='relay'):entries;}
  const quiz = { 'language-quiz': {kind:'word',field:'language'}, 'dialect-detective': {kind:'dialect',field:'region_id'}, 'everyday-language': {kind:'situation',field:'context_id'} } as const;
  if (mode in quiz) {
    // Column names are a fixed server allowlist; values remain parameterized.
    const {kind,field}=quiz[mode as keyof typeof quiz];
    return (await query(`SELECT ${fields} FROM content_entries e WHERE e.deleted_at IS NULL AND kind=$1 AND trim(${field})<>'' AND NOT EXISTS (SELECT 1 FROM content_entries other WHERE other.deleted_at IS NULL AND other.kind=$1 AND ((e.audio_hash IS NOT NULL AND other.audio_hash=e.audio_hash) OR (e.phrase<>'' AND other.phrase<>'' AND lower(trim(other.phrase))=lower(trim(e.phrase)))) AND lower(trim(other.${field}))<>lower(trim(e.${field}))) ORDER BY (id=ANY($2::uuid[])),random() LIMIT 40`, [kind,seenIds]) as Entry[]).map(withLanguageNames);
  }
  if (mode === 'tongue-twisters') return (await query(`SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL AND kind=ANY($1::text[]) AND ($3='' OR language=$3) ORDER BY (id=ANY($2::uuid[])),random() LIMIT 40`, [settings.pronunciationCategory==='twister'?['tongue_twister']:settings.pronunciationCategory==='sound'?['sound_pair']:['tongue_twister','sound_pair'],seenIds,settings.gameLanguages?'':settings.pronunciationLanguage??'']) as Entry[]).map(withLanguageNames);
  return (await query(`SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL AND kind='idiom' ORDER BY (id=ANY($1::uuid[])),random() LIMIT 40`, [seenIds]) as Entry[]).map(withLanguageNames);
}
export async function insertRoom(game: Game) { await database()`INSERT INTO game_rooms(code,state) VALUES (${game.code}, ${JSON.stringify(game)}::jsonb)`; }
export async function getRoom(code: string,includePrompts=true) {
  const rows=await database().query(`SELECT ${includePrompts?'state':"state - 'prompts'"} AS state,version,(SELECT jsonb_object_agg(player_id,extract(epoch FROM seen_at)*1000) FROM room_presence WHERE room_code=$1) AS presence FROM game_rooms WHERE code=$1 AND expires_at>now()`,[code]);
  if(!includePrompts&&rows[0])rows[0].state.prompts=[];
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  const presence=rows[0].presence as Record<string,number>|null;
  for(const player of (rows[0].state as Game).players)player.lastSeenAt=Math.max(player.lastSeenAt??0,Number(presence?.[player.id]??0));
  return rows[0] as { state: Game; version: number };
}
export async function readRoom(code: string) {
  // Polling never needs the future cards. Excluding them in SQL reduces database egress.
  const rows = await database()`SELECT state - 'prompts' - 'playedPrompts' as state FROM game_rooms WHERE code=${code} AND expires_at > now()`;
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  return rows[0].state as Omit<Game, 'prompts'>;
}
export async function readRoomConditional(code:string,tokenHash:string,knownVersion:number){
  const [row]=await database()`SELECT version,EXISTS(SELECT 1 FROM jsonb_array_elements(state->'players') p WHERE p->>'tokenHash'=${tokenHash}) AS authorized,CASE WHEN version<>${knownVersion} THEN state-'prompts'-'playedPrompts' ELSE NULL END AS state FROM game_rooms WHERE code=${code} AND expires_at>now()`;
  if(!row)throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.',404);
  if(!row.authorized)throw new GameError('Du bist nicht Teil dieses Raums.',403);
  return row as {version:number;state:Omit<Game,'prompts'>|null;authorized:boolean};
}
export async function mutateRoom(code: string, mutate: (game: Game) => void,includePrompts=true) {
  for (let i = 0; i < 8; i++) {
    const { state, version } = await getRoom(code,includePrompts); mutate(state);
    const updated=includePrompts
      ?await database()`UPDATE game_rooms SET state=${JSON.stringify(state)}::jsonb,version=version+1 WHERE code=${code} AND version=${version} AND expires_at>now() RETURNING code`
      :await database()`UPDATE game_rooms SET state=(${JSON.stringify(state)}::jsonb - 'prompts') || jsonb_build_object('prompts',state->'prompts'),version=version+1 WHERE code=${code} AND version=${version} AND expires_at>now() RETURNING code`;
    if (updated.length) return state;
  }
  throw new GameError('Viele spielen gerade gleichzeitig. Bitte versuche es noch einmal.', 409);
}
export async function rateLimit(key: string, max: number, seconds = 3600) {
  const rows = await database()`INSERT INTO request_limits(key,hits,expires_at) VALUES (${key},1,now()+${seconds}*interval '1 second') ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN request_limits.expires_at<now() THEN 1 ELSE request_limits.hits+1 END, expires_at=CASE WHEN request_limits.expires_at<now() THEN now()+${seconds}*interval '1 second' ELSE request_limits.expires_at END RETURNING hits`;
  if (Number(rows[0].hits) > max) throw new GameError('Heute schon fleißig gewesen! Bitte versuche es später wieder.', 429);
}
