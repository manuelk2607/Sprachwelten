import {prepareAttributionEntries} from '@/lib/attribution';
import { registeredLanguageNames } from '@/lib/language-registry';
import { neon } from '@neondatabase/serverless';
import type { Entry, EntryInput, Explanation } from '@/lib/content';
import type { Game } from '@/lib/game';
import { GameError } from '@/lib/game';
import type { PlayableGameMode } from '@/lib/modes';
import { otherLocale, storedTranslation } from '@/lib/content-translations';
import { DuplicateEntryError, type EntryIdentity, type ExistingEntry } from '@/lib/entry-duplicates';

export const database = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt.');
  return neon(process.env.DATABASE_URL);
};
const withLanguageNames=(entry:Entry):Entry=>({...entry,challenge:entry.challenge??undefined,languageNames:registeredLanguageNames(entry.language)});
const fields = `id, kind, challenge, phrase, language, credit_name as "creditName",audio_id as "audioId", literal, meaning, example, region, region_id as "regionId", cultural_note as "culturalNote", context, context_id as "contextId", source_locale as "sourceLocale", translations, source_url as "sourceUrl", status, author_name as "authorName", created_at as "createdAt"`;
export async function listEntries(kind = '', language = '', search = '', offset = 0) {
  const sql = database();
  return (await sql.query(`SELECT ${fields} FROM content_entries WHERE ($1='' OR kind=$1) AND ($2='' OR language=$2) AND ($3='' OR phrase ILIKE '%' || $3 || '%' OR meaning ILIKE '%' || $3 || '%' OR translations #>> '{de,meaning}' ILIKE '%' || $3 || '%' OR translations #>> '{en,meaning}' ILIKE '%' || $3 || '%') ORDER BY created_at DESC, id LIMIT 6 OFFSET $4`, [kind, language, search, offset]) as Entry[]).map(withLanguageNames);
}
export async function getEntry(id: string) {
  const sql = database(); const rows = await sql.query(`SELECT ${fields} FROM content_entries WHERE id=$1`, [id]); return rows[0]?withLanguageNames(rows[0] as Entry):undefined;
}
export async function findDuplicateEntry(input:EntryIdentity):Promise<ExistingEntry|undefined> {
  const scope=input.kind==='dialect'?input.regionId??'':input.kind==='situation'?input.contextId??'':input.kind==='attribution'?input.attributionCategory??'':input.kind==='word_order'?input.targetLanguage??'':input.kind==='false_friend'?(input.otherLanguage??'')+':'+(input.otherWord??''):'';
  const rows=await database()`SELECT id,phrase FROM content_entries WHERE kind=${input.kind} AND lower(language)=lower(${input.language}) AND content_phrase_key(phrase)=content_phrase_key(${input.phrase}) AND (CASE WHEN kind='dialect' THEN coalesce(region_id,region) WHEN kind='situation' THEN coalesce(context_id,context) WHEN kind='attribution' THEN coalesce(challenge->>'category','') WHEN kind='word_order' THEN coalesce(challenge->>'targetLanguage','') WHEN kind='false_friend' THEN coalesce(challenge->>'otherLanguage','') || ':' || content_phrase_key(coalesce(challenge->>'otherWord','')) ELSE '' END)=(CASE WHEN ${input.kind}='false_friend' THEN ${input.otherLanguage??''} || ':' || content_phrase_key(${input.otherWord??''}) ELSE ${scope} END) LIMIT 1`;
  return rows[0] as ExistingEntry|undefined;
}
export async function addEntry(input: EntryInput, authorId: string, authorName: string) {
  const sql = database();
  if(input.audioId&&!(await sql`SELECT id FROM pronunciation_audio WHERE id=${input.audioId} AND owner_id=${authorId}`).length)throw new GameError('Diese Aufnahme gehört nicht zu deinem Beitrag.',422);
  const sourceLocale=input.sourceLocale??'de';const translation=storedTranslation(input,input.translation);
  const translations=translation?{[otherLocale(sourceLocale)]:translation}:{};
  const rows = await sql.query(`INSERT INTO content_entries (kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_id,author_name,source_locale,translations,region_id,context_id,credit_name,audio_id,challenge) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19::jsonb) ON CONFLICT DO NOTHING RETURNING ${fields}`,
    [input.kind,input.phrase,input.language,input.literal,input.meaning,input.example,input.region,input.culturalNote,input.context,input.sourceUrl,authorId,authorName,sourceLocale,JSON.stringify(translations),input.regionId??null,input.contextId??null,input.creditName,input.audioId??null,input.challenge?JSON.stringify(input.challenge):null]);
  if(!rows.length)throw new DuplicateEntryError(await findDuplicateEntry({...input,...(input.challenge?.type==='attribution'?{attributionCategory:input.challenge.category}:{}),...(input.challenge?.type==='order'?{targetLanguage:input.challenge.targetLanguage}:{}),...(input.challenge?.type==='friends'?{otherLanguage:input.challenge.otherLanguage,otherWord:input.challenge.otherWord}:{})}));
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
export async function gamePrompts(mode: PlayableGameMode = 'idiom-bluff') {
  const newKinds={'gaming-call':'gaming_mission','generation-chat':'youth_chat','plain-talk':'academic','who-said-it':'attribution','false-friends':'false_friend','word-builder':'word_order'} as const;
  if(mode in newKinds){const entries=(await database().query(`SELECT ${fields} FROM content_entries WHERE kind=$1 ORDER BY random() LIMIT 120`,[newKinds[mode as keyof typeof newKinds]]) as Entry[]).map(withLanguageNames);return mode==='who-said-it'?prepareAttributionEntries(entries):entries;}
  const quiz = { 'language-quiz': {kind:'word',field:'language'}, 'dialect-detective': {kind:'dialect',field:'region_id'}, 'everyday-language': {kind:'situation',field:'context_id'} } as const;
  if (mode in quiz) {
    // Column names are a fixed server allowlist; values remain parameterized.
    const {kind,field}=quiz[mode as keyof typeof quiz];
    return (await database().query(`SELECT ${fields} FROM content_entries e WHERE kind=$1 AND trim(${field})<>'' AND NOT EXISTS (SELECT 1 FROM content_entries other WHERE other.kind=$1 AND lower(trim(other.phrase))=lower(trim(e.phrase)) AND lower(trim(other.${field}))<>lower(trim(e.${field}))) ORDER BY random() LIMIT 40`, [kind]) as Entry[]).map(withLanguageNames);
  }
  if (mode === 'tongue-twisters') return (await database().query(`SELECT ${fields} FROM content_entries WHERE kind IN ('tongue_twister','sound_pair') ORDER BY random() LIMIT 40`, []) as Entry[]).map(withLanguageNames);
  return (await database().query(`SELECT ${fields} FROM content_entries WHERE kind='idiom' ORDER BY random() LIMIT 40`, []) as Entry[]).map(withLanguageNames);
}
export async function insertRoom(game: Game) { await database()`INSERT INTO game_rooms(code,state) VALUES (${game.code}, ${JSON.stringify(game)}::jsonb)`; }
export async function getRoom(code: string,includePrompts=true) {
  const rows=await database().query(`SELECT ${includePrompts?'state':"state - 'prompts'"} AS state,version FROM game_rooms WHERE code=$1 AND expires_at>now()`,[code]);
  if(!includePrompts&&rows[0])rows[0].state.prompts=[];
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  return rows[0] as { state: Game; version: number };
}
export async function readRoom(code: string) {
  // Polling never needs the future cards. Excluding them in SQL reduces database egress.
  const rows = await database()`SELECT state - 'prompts' as state FROM game_rooms WHERE code=${code} AND expires_at > now()`;
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  return rows[0].state as Omit<Game, 'prompts'>;
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
