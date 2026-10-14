import { neon } from '@neondatabase/serverless';
import type { Entry, EntryInput, Explanation } from '@/lib/content';
import type { Game } from '@/lib/game';
import { GameError } from '@/lib/game';
import type { PlayableGameMode } from '@/lib/modes';

export const database = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL fehlt.');
  return neon(process.env.DATABASE_URL);
};
const fields = `id, kind, phrase, language, literal, meaning, example, region, cultural_note as "culturalNote", context, source_url as "sourceUrl", status, author_name as "authorName", created_at as "createdAt"`;
export async function listEntries(kind = '', language = '', search = '', offset = 0) {
  const sql = database();
  return await sql.query(`SELECT ${fields} FROM content_entries WHERE ($1='' OR kind=$1) AND ($2='' OR language=$2) AND ($3='' OR phrase ILIKE '%' || $3 || '%' OR meaning ILIKE '%' || $3 || '%') ORDER BY created_at DESC, id LIMIT 60 OFFSET $4`, [kind, language, search, offset]) as Entry[];
}
export async function getEntry(id: string) {
  const sql = database(); const rows = await sql.query(`SELECT ${fields} FROM content_entries WHERE id=$1`, [id]); return rows[0] as Entry | undefined;
}
export async function addEntry(input: EntryInput, authorId: string, authorName: string) {
  const sql = database();
  const rows = await sql.query(`INSERT INTO content_entries (kind,phrase,language,literal,meaning,example,region,cultural_note,context,source_url,author_id,author_name) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING ${fields}`,
    [input.kind,input.phrase,input.language,input.literal,input.meaning,input.example,input.region,input.culturalNote,input.context,input.sourceUrl,authorId,authorName]); return rows[0] as Entry;
}
export async function listExplanations(id: string) {
  return await database()`SELECT id, body, author_name as "authorName", created_at as "createdAt" FROM explanations WHERE entry_id=${id} ORDER BY created_at LIMIT 100` as Explanation[];
}
export async function addExplanation(id: string, body: string, authorId: string, authorName: string) {
  return await database()`INSERT INTO explanations(entry_id,body,author_id,author_name) VALUES (${id},${body},${authorId},${authorName}) RETURNING id`;
}
export async function gamePrompts(mode: PlayableGameMode = 'idiom-bluff') {
  if (mode === 'language-quiz') {
    // A spelling recorded in multiple languages cannot have one clear answer.
    return await database().query(`SELECT ${fields} FROM content_entries e WHERE kind='word' AND NOT EXISTS (SELECT 1 FROM content_entries other WHERE other.kind='word' AND lower(trim(other.phrase))=lower(trim(e.phrase)) AND other.language<>e.language) ORDER BY random() LIMIT 40`, []) as Entry[];
  }
  return await database().query(`SELECT ${fields} FROM content_entries WHERE kind='idiom' AND status='curated' ORDER BY random() LIMIT 40`, []) as Entry[];
}
export async function insertRoom(game: Game) { await database()`INSERT INTO game_rooms(code,state) VALUES (${game.code}, ${JSON.stringify(game)}::jsonb)`; }
export async function getRoom(code: string) {
  const rows = await database()`SELECT state, version FROM game_rooms WHERE code=${code} AND expires_at > now()`;
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  return rows[0] as { state: Game; version: number };
}
export async function readRoom(code: string) {
  // Polling never needs the future cards. Excluding them in SQL reduces database egress.
  const rows = await database()`SELECT state - 'prompts' as state FROM game_rooms WHERE code=${code} AND expires_at > now()`;
  if (!rows[0]) throw new GameError('Dieser Raum existiert nicht oder ist abgelaufen.', 404);
  return rows[0].state as Omit<Game, 'prompts'>;
}
export async function mutateRoom(code: string, mutate: (game: Game) => void) {
  for (let i = 0; i < 8; i++) {
    const { state, version } = await getRoom(code); mutate(state);
    const updated = await database()`UPDATE game_rooms SET state=${JSON.stringify(state)}::jsonb, version=version+1 WHERE code=${code} AND version=${version} AND expires_at>now() RETURNING code`;
    if (updated.length) return state;
  }
  throw new GameError('Viele spielen gerade gleichzeitig. Bitte versuche es noch einmal.', 409);
}
export async function rateLimit(key: string, max: number, seconds = 3600) {
  const rows = await database()`INSERT INTO request_limits(key,hits,expires_at) VALUES (${key},1,now()+${seconds}*interval '1 second') ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN request_limits.expires_at<now() THEN 1 ELSE request_limits.hits+1 END, expires_at=CASE WHEN request_limits.expires_at<now() THEN now()+${seconds}*interval '1 second' ELSE request_limits.expires_at END RETURNING hits`;
  if (Number(rows[0].hits) > max) throw new GameError('Heute schon fleißig gewesen! Bitte versuche es später wieder.', 429);
}
