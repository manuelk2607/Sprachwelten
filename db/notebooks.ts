import { database, fields, withLanguageNames } from "./repository";
import { GameError } from "@/lib/game";
import {
  vocabularyDirection,
  vocabularyQuestion,
  vocabularyQuestionId,
  type NotebookInput,
  type Notebook,
  type VocabularyCard,
} from "@/lib/vocabulary";
import { learningText } from "@/lib/learning-content";
import { localizedTexts } from "@/lib/content-translations";
import type { Entry } from "@/lib/content";
const bookFields = `id,name,description,source_language AS "sourceLanguage",target_language AS "targetLanguage",revision`;
const compatible = (e: string, source: string, target: string) =>
  `(${e}.kind='vocabulary' AND ${e}.deleted_at IS NULL AND ${e}.canonical_vocabulary_id IS NULL AND ((${e}.language=${target} AND ${e}.challenge->'vocabulary'->>'translationLanguage'=${source}) OR (${e}.language=${source} AND ${e}.challenge->'vocabulary'->>'translationLanguage'=${target} AND ${e}.challenge->'vocabulary'->>'reversible'='true')))`;
export async function listNotebooks(owner: string) {
  return (await database().query(
    `SELECT ${bookFields},(SELECT count(*)::int FROM vocabulary_notebook_items i WHERE i.notebook_id=n.id) AS count,coalesce(s.due,0)::int AS due,coalesce(s.difficult,0)::int AS difficult,coalesce(s.practiced,0)::int AS practiced,coalesce(s.attempts,0)::int AS attempts,coalesce(s.mistakes,0)::int AS mistakes FROM vocabulary_notebooks n LEFT JOIN LATERAL (SELECT count(*) FILTER(WHERE p.due_at<=now()) AS due,count(*) FILTER(WHERE p.lapses>0 AND p.streak<3) AS difficult,count(*) FILTER(WHERE p.attempts>0) AS practiced,sum(p.attempts) AS attempts,sum(p.lapses) AS mistakes FROM vocabulary_notebook_items i JOIN content_entries e ON e.id=i.entry_id LEFT JOIN learning_progress p ON p.entry_id=e.id AND p.owner_id=n.owner_id AND p.question_id='vocab-'||n.target_language AND p.revision=e.revision WHERE i.notebook_id=n.id AND ${compatible("e", "n.source_language", "n.target_language")}) s ON true WHERE owner_id=$1 ORDER BY updated_at DESC,id LIMIT 50`,
    [owner],
  )) as Notebook[];
}
export async function getNotebook(owner: string, id: string) {
  const [row] = await database().query(
    `SELECT ${bookFields} FROM vocabulary_notebooks WHERE id=$1 AND owner_id=$2`,
    [id, owner],
  );
  if (!row)
    throw new GameError("Dieses Vokabelheft wurde nicht gefunden.", 404);
  return row as Notebook;
}
export async function createNotebook(owner: string, input: NotebookInput) {
  const rows = await database().query(
    `INSERT INTO vocabulary_notebooks(owner_id,name,description,source_language,target_language) SELECT $1,$2,$3,$4,$5 WHERE (SELECT count(*) FROM vocabulary_notebooks WHERE owner_id=$1)<50 RETURNING ${bookFields}`,
    [
      owner,
      input.name,
      input.description,
      input.sourceLanguage,
      input.targetLanguage,
    ],
  );
  if (!rows.length)
    throw new GameError("Du kannst bis zu 50 Vokabelhefte anlegen.", 422);
  return rows[0] as Notebook;
}
export async function updateNotebook(
  owner: string,
  id: string,
  input: NotebookInput,
  revision: number,
) {
  const rows = await database().query(
    `UPDATE vocabulary_notebooks n SET name=$3,description=$4,source_language=$5,target_language=$6,revision=revision+1,updated_at=now() WHERE id=$1 AND owner_id=$2 AND revision=$7 AND ((source_language=$5 AND target_language=$6) OR NOT EXISTS(SELECT 1 FROM vocabulary_notebook_items WHERE notebook_id=n.id)) RETURNING ${bookFields}`,
    [
      id,
      owner,
      input.name,
      input.description,
      input.sourceLanguage,
      input.targetLanguage,
      revision,
    ],
  );
  if (!rows.length)
    throw new GameError(
      "Das Heft wurde geändert oder enthält bereits Wörter. Sprachpaare können nur in leeren Heften geändert werden.",
      409,
    );
  return rows[0] as Notebook;
}
export async function deleteNotebook(
  owner: string,
  id: string,
  revision: number,
) {
  const rows = await database().query(
    `DELETE FROM vocabulary_notebooks WHERE id=$1 AND owner_id=$2 AND revision=$3 RETURNING id`,
    [id, owner, revision],
  );
  if (!rows.length)
    throw new GameError(
      "Das Heft wurde inzwischen geändert. Bitte lade die Liste neu.",
      409,
    );
}
export type VocabularyFilter = {
  sourceLanguage: string;
  targetLanguage: string;
  notebookId?: string;
  query?: string;
  level?: string;
  topic?: string;
  status?: "all" | "new" | "due" | "difficult" | "known";
  sort?: "alpha" | "recent" | "due" | "difficult";
  offset?: number;
  ids?: string[];
};
export async function vocabularyCards(
  owner: string | undefined,
  filter: VocabularyFilter,
  locale: "de" | "en",
) {
  const sql = database();
  if (filter.notebookId) {
    const book = await getNotebook(owner ?? "", filter.notebookId);
    if (!(
      [book.sourceLanguage, book.targetLanguage].includes(
        filter.sourceLanguage,
      ) &&
      [book.sourceLanguage, book.targetLanguage].includes(filter.targetLanguage)
    ))
      throw new GameError(
        "Dieses Sprachpaar passt nicht zum Vokabelheft.",
        422,
      );
  }
  const pattern = "%" + (filter.query ?? "").replace(/[\\%_]/g, "\\$&") + "%";
  const order = {
    alpha: "lower(CASE WHEN language=$3 THEN literal ELSE phrase END),id",
    recent: "created_at DESC,id",
    due: "CASE WHEN due_at<=now() THEN 0 WHEN attempts IS NULL THEN 1 ELSE 2 END,due_at NULLS FIRST,id",
    difficult: "lapses DESC,streak,id",
  }[filter.sort ?? "alpha"];
  const rows = await sql.query(
    `WITH available AS (SELECT e.*,p.streak,p.lapses,p.attempts,p.due_at,CASE WHEN coalesce(p.attempts,0)=0 THEN 'new' WHEN p.due_at<=now() THEN 'due' WHEN p.streak>=3 THEN 'known' ELSE 'learning' END AS learning_status FROM content_entries e LEFT JOIN learning_progress p ON p.owner_id=$1 AND p.entry_id=e.id AND p.question_id=$4 AND p.revision=e.revision WHERE ${compatible("e", "$2", "$3")} AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM vocabulary_notebook_items i JOIN vocabulary_notebooks n ON n.id=i.notebook_id WHERE i.entry_id=e.id AND i.notebook_id=$5 AND n.owner_id=$1)) AND ($6='%%' OR concat_ws(' ',e.phrase,e.literal,e.sense,e.meaning) ILIKE $6) AND ($7='' OR e.challenge->>'level'=$7) AND ($8='' OR e.challenge->'topic'->>'de'=$8 OR e.challenge->'topic'->>'en'=$8) AND ($9::uuid[] IS NULL OR e.id=ANY($9::uuid[]))), filtered AS (SELECT * FROM available WHERE $10='all' OR learning_status=$10 OR ($10='difficult' AND lapses>0 AND streak<3)) SELECT ${fields},streak,lapses,attempts,due_at AS "dueAt",learning_status AS "learningStatus" FROM filtered ORDER BY ${order} LIMIT 31 OFFSET $11`,
    [
      owner ?? "",
      filter.sourceLanguage,
      filter.targetLanguage,
      vocabularyQuestionId(filter.sourceLanguage, filter.targetLanguage),
      filter.notebookId ?? null,
      pattern,
      filter.level ?? "",
      filter.topic ?? "",
      filter.ids ?? null,
      filter.status ?? "all",
      Math.min(10000, Math.max(0, filter.offset ?? 0)),
    ],
  );
  const cards = rows.slice(0, 30).flatMap((row) => {
    const entry = withLanguageNames(row as Entry),
      card = vocabularyDirection(
        entry,
        filter.sourceLanguage,
        filter.targetLanguage,
      );
    if (!card) return [];
    const texts = localizedTexts(entry, locale);
    return [
      {
        ...card,
        meaning: texts.meaning,
        feedback: {
          de: [localizedTexts(entry, "de").meaning, card.example]
            .filter(Boolean)
            .join(" "),
          en: [localizedTexts(entry, "en").meaning, card.example]
            .filter(Boolean)
            .join(" "),
        },
        example: card.example,
        streak: Number(row.streak ?? 0),
        lapses: Number(row.lapses ?? 0),
        attempts: Number(row.attempts ?? 0),
        dueAt: row.dueAt as string | null,
        status: row.learningStatus as VocabularyCard["status"],
      },
    ];
  });
  const options = await sql.query(
    `SELECT DISTINCT e.challenge->'topic' AS topic,e.challenge->>'level' AS level FROM content_entries e WHERE ${compatible("e", "$2", "$3")} AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM vocabulary_notebook_items i JOIN vocabulary_notebooks n ON n.id=i.notebook_id WHERE i.entry_id=e.id AND i.notebook_id=$4 AND n.owner_id=$1)) LIMIT 200`,
    [
      owner ?? "",
      filter.sourceLanguage,
      filter.targetLanguage,
      filter.notebookId ?? null,
    ],
  );
  return {
    cards,
    unavailableIds:filter.notebookId?(await sql.query(`SELECT i.entry_id AS id FROM vocabulary_notebook_items i JOIN vocabulary_notebooks n ON n.id=i.notebook_id LEFT JOIN content_entries e ON e.id=i.entry_id WHERE n.id=$1 AND n.owner_id=$2 AND NOT ${compatible('e','n.source_language','n.target_language')} LIMIT 100`,[filter.notebookId,owner??''])).map(row=>String(row.id)):[],
    more: rows.length > 30,
    topics: options.map((row) => row.topic as { de: string; en: string }),
    levels: [...new Set(options.map((row) => String(row.level)))],
  };
}
export async function changeNotebookItems(
  owner: string,
  id: string,
  revision: number,
  action: "add" | "remove" | "move",
  entryIds: string[],
  targetId?: string,
) {
  const sql = database(),
    book = await getNotebook(owner, id),
    target =
      action === "move" ? await getNotebook(owner, targetId ?? "") : book;
  if (action === "move" && target.id === book.id)
    throw new GameError("Bitte ein anderes Zielheft wählen.", 422);
  const entries = (await sql.query(
    `SELECT ${fields} FROM content_entries WHERE id IN (SELECT coalesce(canonical_vocabulary_id,id) FROM content_entries WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL) AND deleted_at IS NULL`,
    [entryIds],
  )) as Entry[];
  if (entries.length !== new Set(entryIds).size && action !== "remove")
    throw new GameError(
      "Mindestens eine Vokabel ist nicht mehr verfügbar oder doppelt ausgewählt.",
      409,
    );
  if (
    action !== "remove" &&
    entries.some(
      (e) =>
        !vocabularyDirection(e, target.sourceLanguage, target.targetLanguage),
    )
  )
    throw new GameError(
      "Die ausgewählten Wörter passen nicht zur freigegebenen Sprachrichtung des Zielhefts.",
      422,
    );
  const selected = action === "remove" ? entryIds : entries.map((e) => e.id),
    snapshots = entries.map((e) => ({ id: e.id, revision: e.revision }));
  const rows = await sql.query(
    `WITH locks AS MATERIALIZED(SELECT * FROM vocabulary_notebooks WHERE owner_id=$1 AND ((id=$2 AND revision=$3) OR ($4::uuid IS NOT NULL AND id=$4 AND revision=$5)) ORDER BY id FOR UPDATE), ready AS MATERIALIZED(SELECT 1 FROM locks WHERE id=$2 AND (SELECT count(*) FROM locks)=$6 AND ($7='remove' OR ((SELECT count(*) FROM content_entries e JOIN jsonb_to_recordset($8::jsonb) s(id uuid,revision integer) ON e.id=s.id AND e.revision=s.revision CROSS JOIN locks n WHERE n.id=coalesce($4::uuid,$2::uuid) AND ${compatible("e", "n.source_language", "n.target_language")})=$9 AND (SELECT count(*) FROM vocabulary_notebook_items WHERE notebook_id=coalesce($4::uuid,$2::uuid))+(SELECT count(*) FROM unnest($10::uuid[]) wanted(entry_id) WHERE NOT EXISTS(SELECT 1 FROM vocabulary_notebook_items existing WHERE existing.notebook_id=coalesce($4::uuid,$2::uuid) AND existing.entry_id=wanted.entry_id))<=1000)) AND ($7<>'move' OR (SELECT count(*) FROM vocabulary_notebook_items WHERE notebook_id=$2 AND entry_id=ANY($10::uuid[]))=$9)), added AS (INSERT INTO vocabulary_notebook_items(notebook_id,entry_id) SELECT coalesce($4::uuid,$2::uuid),unnest($10::uuid[]) FROM ready WHERE $7<>'remove' ON CONFLICT DO NOTHING RETURNING entry_id), removed AS (DELETE FROM vocabulary_notebook_items WHERE notebook_id=$2 AND entry_id=ANY($10::uuid[]) AND $7 IN ('remove','move') AND EXISTS(SELECT 1 FROM ready) RETURNING entry_id) UPDATE vocabulary_notebooks SET revision=revision+1,updated_at=now() WHERE id IN (SELECT id FROM locks) AND EXISTS(SELECT 1 FROM ready) RETURNING id`,
    [
      owner,
      id,
      revision,
      action === "move" ? target.id : null,
      target.revision,
      action === "move" ? 2 : 1,
      action,
      JSON.stringify(snapshots),
      selected.length,
      selected,
    ],
  );
  if (!rows.length)
    throw new GameError(
      "Das Heft oder ein Wort wurde inzwischen geändert. Bitte lade die Liste neu.",
      409,
    );
}
export async function startVocabulary(
  owner: string,
  persistent: boolean,
  filter: VocabularyFilter,
  locale: "de" | "en",
  exercise: "writing" | "flashcard",
  direction: "forward" | "reverse" | "both" = "forward",
) {
  let effective = filter;
  if (
    direction === "reverse" ||
    (direction === "both" &&
      crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 1)
  )
    effective = {
      ...filter,
      sourceLanguage: filter.targetLanguage,
      targetLanguage: filter.sourceLanguage,
    };
  let available = await vocabularyCards(
    owner,
    { ...effective, sort: "due", offset: 0 },
    locale,
  );
  if (!available.cards.length && direction === "both")
    available = await vocabularyCards(
      owner,
      { ...filter, sort: "due", offset: 0 },
      locale,
    );
  if (!available.cards.length)
    throw new GameError(
      "Keine passenden Wörter für diese Lernrichtung oder diesen Lernstatus vorhanden.",
      404,
    );
  const due = available.cards.filter((c) => c.status === "due"),
    fresh = available.cards.filter((c) => c.status === "new"),
    candidates = due.length ? due : fresh.length ? fresh : available.cards,
    card =
      candidates[
        crypto.getRandomValues(new Uint32Array(1))[0] %
          Math.min(candidates.length, 10)
      ],
    question = vocabularyQuestion(card),
    id = crypto.randomUUID();
  await database().query(
    `INSERT INTO learning_attempts(id,owner_id,entry_id,question_id,revision,question,expires_at,persistent,notebook_id,practice_mode) VALUES($1,$2,$3,$4,$5,$6::jsonb,now()+interval '30 minutes',$7,$8,$9) ON CONFLICT(owner_id,entry_id,question_id,revision) WHERE consumed_at IS NULL DO UPDATE SET id=EXCLUDED.id,question=EXCLUDED.question,expires_at=EXCLUDED.expires_at,persistent=EXCLUDED.persistent,notebook_id=EXCLUDED.notebook_id,practice_mode=EXCLUDED.practice_mode,revealed_at=NULL`,
    [
      id,
      owner,
      card.id,
      question.id,
      card.revision,
      JSON.stringify(question),
      persistent,
      filter.notebookId ?? null,
      exercise,
    ],
  );
  return {
    id,
    exercise,
    prompt: learningText(question.prompt, locale),
    choices: [],
    sourceLanguage: card.sourceLanguage,
    targetLanguage: card.targetLanguage,
    kind: "vocabulary",
  };
}
