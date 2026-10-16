import { z } from 'zod';
import { getAuth } from '@/lib/auth/server';
import { GameError } from '@/lib/game';
import { DuplicateEntryError } from '@/lib/entry-duplicates';

export function respond(body: unknown, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }); }
export async function safe(work: () => Promise<Response>) {
  try { return await work(); }
  catch (error) {
    if (error instanceof z.ZodError) return respond({ error: error.issues[0]?.message ?? 'Bitte die Eingaben prüfen.',issues:error.issues.map(issue=>({path:issue.path,message:issue.message})) }, 422);
    if (error instanceof DuplicateEntryError) return respond({error:error.message,duplicate:error.duplicate},409);
    if (error instanceof GameError) return respond({ error: error.message }, error.status);
    console.error('Request failed:', error instanceof Error ? error.name : 'Unknown');
    return respond({ error: 'Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.' }, 503);
  }
}
export async function body<S extends z.ZodTypeAny>(request: Request, schema: S): Promise<z.output<S>> {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new GameError('Diese Anfrage ist nicht erlaubt.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new GameError('Bitte JSON senden.', 415);
  const reader = request.body?.getReader(); if (!reader) throw new GameError('Die Anfrage ist leer.', 400);
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; length += value.byteLength; if (length > 32000) { await reader.cancel(); throw new GameError('Diese Eingabe ist zu lang.', 413); } chunks.push(value); }
  const bytes = new Uint8Array(length); let offset=0; for(const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
  let data: unknown; try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new GameError('Die Anfrage konnte nicht gelesen werden.', 400); }
  return schema.parse(data);
}
export async function account() {
  const { data, error } = await getAuth().getSession();
  if (error || !data?.user) throw new GameError('Bitte melde dich an, um etwas beizutragen.', 401);
  return { id: data.user.id, name: data.user.name?.trim().slice(0,60) || 'Mitglied' };
}
export async function hashToken(token: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2,'0')).join('');
}
export async function playerToken(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new GameError('Bitte tritt dem Raum erneut bei.', 401);
  return hashToken(token);
}
export function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join(''); }
