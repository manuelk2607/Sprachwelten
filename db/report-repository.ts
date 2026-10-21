import { database } from "./repository";
import type { Entry } from "@/lib/content";
import { GameError } from "@/lib/game";
import type { RoundReport } from "@/lib/round-reports";
export async function addRoundReport(
  fingerprint: string,
  entry: Entry,
  mode: string,
  reason: RoundReport["reason"],
  note: string,
) {
  const snapshot = {
    id: entry.id,
    kind: entry.kind,
    phrase: entry.phrase,
    language: entry.language,
    challenge: entry.challenge,
    literal: entry.literal,
    meaning: entry.meaning,
  };
  await database()`INSERT INTO round_reports(fingerprint,entry_id,snapshot,mode,reason,note) VALUES (${fingerprint},(SELECT id FROM content_entries WHERE id=${entry.id}),${JSON.stringify(snapshot)}::jsonb,${mode},${reason},${note}) ON CONFLICT (fingerprint) DO NOTHING`;
}
export async function reports(resolved: boolean) {
  return (await database()`SELECT id,entry_id AS "entryId",snapshot,mode,reason,note,status,revision,created_at AS "createdAt" FROM round_reports WHERE status=${resolved ? "resolved" : "open"} ORDER BY created_at DESC,id LIMIT 50`) as RoundReport[];
}
export async function resolveReport(
  id: string,
  revision: number,
  resolved: boolean,
  admin: string,
) {
  const rows =
    await database()`UPDATE round_reports SET status=${resolved ? "resolved" : "open"},revision=revision+1,resolved_at=CASE WHEN ${resolved} THEN now() ELSE NULL END,resolved_by=CASE WHEN ${resolved} THEN ${admin}::uuid ELSE NULL END WHERE id=${id} AND revision=${revision} RETURNING id`;
  if (!rows.length)
    throw new GameError(
      "Die Meldung wurde inzwischen geändert. Bitte lade die Liste neu.",
      409,
    );
}
