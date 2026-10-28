import { database } from "./repository";
import { GameError } from "@/lib/game-error";
import {
  minimumReviewedPerLevel,
  type DifficultyLevel,
} from "@/lib/editorial-difficulty";
import {
  editorialReviewInput,
  type EditorialReviewInput,
  type StoredEditorialReview,
} from "@/lib/editorial-review-input";
import {
  difficultyGroups,
  type DifficultySettings,
} from "@/lib/game-difficulty";
import { difficultyLevels } from "@/lib/editorial-difficulty";

const reviewFields = `content_revision AS "contentRevision",review_revision AS "reviewRevision",level,reviewed,reviewed_at::text AS "reviewedAt",sources,rationale`;
export async function getEditorialReview(id: string) {
  const [entry] =
    await database()`SELECT revision,kind,CASE WHEN kind='word_order' THEN challenge->>'targetLanguage' ELSE language END AS language,CASE WHEN kind='attribution' THEN kind||':'||(challenge->>'category') ELSE kind END AS category FROM content_entries WHERE id=${id} AND deleted_at IS NULL`;
  if (!entry) throw new GameError("Dieser Beitrag wurde nicht gefunden.", 404);
  if (["vocabulary", "grammar"].includes(String(entry.kind)))
    throw new GameError(
      "Lernniveaus werden getrennt von Spiel-Schwierigkeitsstufen verwaltet.",
      422,
    );
  const [review] = await database().query(
    `SELECT ${reviewFields} FROM entry_difficulty_reviews WHERE entry_id=$1`,
    [id],
  );
  return {
    entryRevision: Number(entry.revision),
    kind: String(entry.kind),
    category: String(entry.category),
    language: String(entry.language),
    review: (review ?? null) as StoredEditorialReview | null,
    effective:
      !!review &&
      review.reviewed === true &&
      review.contentRevision === entry.revision,
  };
}
export async function saveEditorialReview(
  id: string,
  input: EditorialReviewInput,
  actor: string,
) {
  const data = editorialReviewInput.parse(input);
  const rows = await database().query(
    `WITH target AS MATERIALIZED(SELECT id FROM content_entries WHERE id=$1 AND revision=$2 AND deleted_at IS NULL AND kind NOT IN ('vocabulary','grammar') FOR UPDATE), saved AS (INSERT INTO entry_difficulty_reviews(entry_id,content_revision,review_revision,level,reviewed,reviewed_at,sources,rationale,reviewer_id) SELECT id,$2,1,$4,$5,$6::date,$7::jsonb,$8,$9::uuid FROM target WHERE $3=0 OR EXISTS(SELECT 1 FROM entry_difficulty_reviews WHERE entry_id=$1) ON CONFLICT(entry_id) DO UPDATE SET content_revision=EXCLUDED.content_revision,review_revision=entry_difficulty_reviews.review_revision+1,level=EXCLUDED.level,reviewed=EXCLUDED.reviewed,reviewed_at=EXCLUDED.reviewed_at,sources=EXCLUDED.sources,rationale=EXCLUDED.rationale,reviewer_id=EXCLUDED.reviewer_id,updated_at=now() WHERE entry_difficulty_reviews.review_revision=$3 RETURNING *) INSERT INTO entry_difficulty_events(entry_id,review_revision,actor_id,data) SELECT entry_id,review_revision,$9::uuid,to_jsonb(saved)-'reviewer_id' FROM saved RETURNING review_revision AS "reviewRevision"`,
    [
      id,
      data.entryRevision,
      data.reviewRevision,
      data.level,
      data.reviewed,
      data.reviewedAt,
      JSON.stringify(data.sources),
      data.rationale,
      actor,
    ],
  );
  if (!rows.length)
    throw new GameError(
      "Der Beitrag oder die Einstufung wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  return rows[0];
}
export async function editorialAvailability(
  category: string,
  language: string,
) {
  const rows = await database().query(
    `SELECT r.level,count(DISTINCT e.id)::int AS count FROM entry_difficulty_reviews r JOIN content_entries e ON e.id=r.entry_id AND e.revision=r.content_revision AND e.deleted_at IS NULL WHERE (CASE WHEN e.kind='attribution' THEN e.kind||':'||(e.challenge->>'category') ELSE e.kind END)=$1 AND (CASE WHEN e.kind='word_order' THEN e.challenge->>'targetLanguage' ELSE e.language END)=$2 AND r.reviewed AND r.reviewed_at<=CURRENT_DATE GROUP BY r.level ORDER BY r.level`,
    [category, language],
  );
  return {
    counts: Object.fromEntries(
      rows.map((r) => [String(r.level), Number(r.count)]),
    ),
    levels: rows
      .filter((r) => Number(r.count) >= minimumReviewedPerLevel)
      .map((r) => r.level as DifficultyLevel),
  };
}
export async function readyGameDifficulties(
  mode: string,
  settings: DifficultySettings,
) {
  const groups = difficultyGroups(mode, settings),
    languages = settings.gameLanguages ?? [];
  if (!groups.length || !languages.length) return [];
  const rows = await database().query(
    `SELECT CASE WHEN e.kind='attribution' THEN e.kind||':'||(e.challenge->>'category') ELSE e.kind END AS category,CASE WHEN e.kind='word_order' THEN e.challenge->>'targetLanguage' ELSE e.language END AS language,r.level,count(DISTINCT e.id)::int AS count FROM entry_difficulty_reviews r JOIN content_entries e ON e.id=r.entry_id AND e.revision=r.content_revision AND e.deleted_at IS NULL WHERE r.reviewed AND r.reviewed_at<=CURRENT_DATE AND (CASE WHEN e.kind='attribution' THEN e.kind||':'||(e.challenge->>'category') ELSE e.kind END)=ANY($2::text[]) AND (CASE WHEN e.kind='word_order' THEN e.challenge->>'targetLanguage' ELSE e.language END)=ANY($3::text[]) GROUP BY 1,2,3 HAVING count(DISTINCT e.id)>=$1`,
    [minimumReviewedPerLevel, groups, languages],
  );
  return difficultyLevels.filter((level) =>
    groups.every((category) =>
      languages.every((language) =>
        rows.some(
          (r) =>
            r.category === category &&
            r.language === language &&
            r.level === level,
        ),
      ),
    ),
  );
}
