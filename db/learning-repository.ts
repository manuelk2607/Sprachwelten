import { database, fields, withLanguageNames } from "./repository";
import { GameError } from "@/lib/game";
import {
  learningChallenge,
  gradeLearning,
  type LearningQuestion,
  learningText,
} from "@/lib/learning-content";
import type { Entry } from "@/lib/content";
import { publicEntry } from "@/lib/content-public";

export type LearningFilter = {
  language: string;
  domain?: "vocabulary" | "grammar";
  level?: string;
  topic?: string;
};
export async function learningCatalog(
  filter: LearningFilter,
  ownerId?: string,
  offset = 0,
) {
  const sql = database();
  const rows = await sql.query(
    `SELECT ${fields} FROM content_entries WHERE deleted_at IS NULL AND kind IN ('vocabulary','grammar') AND language=$1 AND ($2='' OR kind=$2) AND ($3='' OR challenge->>'level'=$3) AND ($4='' OR challenge->'topic'->>'de'=$4 OR challenge->'topic'->>'en'=$4) ORDER BY challenge->>'level',created_at,id LIMIT 13 OFFSET $5`,
    [
      filter.language,
      filter.domain ?? "",
      filter.level ?? "",
      filter.topic ?? "",
      Math.max(0, Math.min(10000, Math.floor(offset))),
    ],
  );
  const entries = (rows.slice(0, 12) as Entry[])
    .map(withLanguageNames)
    .filter((e) => learningChallenge.safeParse(e.challenge).success);
  const stats = ownerId
    ? await sql.query(
        `SELECT count(*)::int AS practiced,coalesce(sum(p.attempts),0)::int AS attempts,coalesce(sum(p.lapses),0)::int AS mistakes,count(*) FILTER(WHERE p.due_at<=now())::int AS due FROM learning_progress p JOIN content_entries e ON e.id=p.entry_id AND e.revision=p.revision WHERE p.owner_id=$1 AND e.deleted_at IS NULL AND e.language=$2 AND ($3='' OR e.kind=$3) AND ($4='' OR e.challenge->>'level'=$4) AND ($5='' OR e.challenge->'topic'->>'de'=$5 OR e.challenge->'topic'->>'en'=$5)`,
        [
          ownerId,
          filter.language,
          filter.domain ?? "",
          filter.level ?? "",
          filter.topic ?? "",
        ],
      )
    : [];
  // The catalogue is a deliberate lesson view; solutions are never included in
  // the practice projection until this owner's attempt has been submitted.
  const units = await sql.query(
    `SELECT DISTINCT challenge->'topic' AS topic,challenge->>'level' AS level FROM content_entries WHERE deleted_at IS NULL AND kind IN ('vocabulary','grammar') AND language=$1 ORDER BY level LIMIT 200`,
    [filter.language],
  );
  return {
    entries: entries.map(publicEntry),
    stats: stats[0] ?? null,
    more: rows.length > 12,
    topics: units.map((u) => u.topic as { de: string; en: string }),
    levels: [...new Set(units.map((u) => String(u.level)))],
  };
}
export async function learningLanguages() {
  return (await database()`SELECT language,count(*)::int AS count FROM content_entries WHERE deleted_at IS NULL AND kind IN ('vocabulary','grammar') GROUP BY language ORDER BY language`) as {
    language: string;
    count: number;
  }[];
}
export async function startLearning(
  ownerId: string,
  persistent: boolean,
  filter: LearningFilter,
  locale: "de" | "en",
  review: boolean,
) {
  const sql = database();
  await sql.query(
    `DELETE FROM learning_attempts WHERE id IN (SELECT id FROM learning_attempts WHERE owner_id=$1 AND expires_at<now() LIMIT 200)`,
    [ownerId],
  );
  const rows = await sql.query(
    `SELECT e.id,e.revision,e.phrase,e.kind,q.value AS question FROM content_entries e CROSS JOIN LATERAL jsonb_array_elements(coalesce(e.challenge->'questions','[]'::jsonb)) q(value) LEFT JOIN learning_progress p ON p.owner_id=$1 AND p.entry_id=e.id AND p.question_id=q.value->>'id' AND p.revision=e.revision WHERE e.deleted_at IS NULL AND e.kind IN ('vocabulary','grammar') AND e.language=$2 AND ($3='' OR e.kind=$3) AND ($4='' OR e.challenge->>'level'=$4) AND ($5='' OR e.challenge->'topic'->>'de'=$5 OR e.challenge->'topic'->>'en'=$5) AND ($6=false OR p.due_at<=now()) ORDER BY CASE WHEN p.due_at<=now() THEN 0 WHEN p.entry_id IS NULL THEN 1 ELSE 2 END,p.due_at NULLS FIRST,random() LIMIT 1`,
    [
      ownerId,
      filter.language,
      filter.domain ?? "",
      filter.level ?? "",
      filter.topic ?? "",
      review,
    ],
  );
  const row = rows[0];
  if (!row)
    throw new GameError(
      review
        ? "Für diese Auswahl sind keine Wiederholungen fällig."
        : "Für diese Auswahl sind noch keine Lernaufgaben vorhanden.",
      404,
    );
  const question = row.question as LearningQuestion,
    id = crypto.randomUUID();
  // Replace an abandoned question atomically; another tab receives a stale-
  // attempt error rather than sharing or overwriting an answer.
  await sql.query(
    `INSERT INTO learning_attempts(id,owner_id,entry_id,question_id,revision,question,expires_at,persistent) VALUES($1,$2,$3,$4,$5,$6::jsonb,now()+interval '30 minutes',$7) ON CONFLICT(owner_id,entry_id,question_id,revision) WHERE consumed_at IS NULL DO UPDATE SET id=EXCLUDED.id,question=EXCLUDED.question,expires_at=EXCLUDED.expires_at,persistent=EXCLUDED.persistent`,
    [
      id,
      ownerId,
      row.id,
      question.id,
      row.revision,
      JSON.stringify(question),
      persistent,
    ],
  );
  const choices = [...question.choices];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return {
    id,
    exercise: question.exercise,
    prompt: learningText(question.prompt, locale),
    choices,
    kind: row.kind,
  };
}
export const notebookAttemptMembership=(alias:string)=>`(${alias}.notebook_id IS NULL OR EXISTS(SELECT 1 FROM vocabulary_notebooks n JOIN vocabulary_notebook_items i ON i.notebook_id=n.id WHERE n.id=${alias}.notebook_id AND n.owner_id=${alias}.owner_id AND i.entry_id=${alias}.entry_id))`;
export async function revealVocabulary(owner:string,id:string,locale:'de'|'en'){
 const rows=await database().query(`UPDATE learning_attempts a SET revealed_at=coalesce(revealed_at,now()) WHERE a.id=$1 AND a.owner_id=$2 AND a.practice_mode='flashcard' AND a.consumed_at IS NULL AND a.expires_at>now() AND ${notebookAttemptMembership('a')} AND EXISTS(SELECT 1 FROM content_entries e WHERE e.id=a.entry_id AND e.revision=a.revision AND e.deleted_at IS NULL) RETURNING a.question`,[id,owner]);
 if(!rows.length)throw new GameError('Diese Lernkarte ist nicht mehr verfügbar.',409);
 const question=rows[0].question as LearningQuestion;return {answers:question.answers,explanation:learningText(question.explanation,locale)};
}
export async function answerLearning(
  ownerId: string,
  id: string,
  answer: string,
  locale: "de" | "en",
  remembered?:boolean,
) {
  const sql = database();
  const [attempt] = await sql.query(
    `SELECT a.* FROM learning_attempts a JOIN content_entries e ON e.id=a.entry_id AND e.revision=a.revision AND e.deleted_at IS NULL WHERE a.id=$1 AND a.owner_id=$2 AND a.consumed_at IS NULL AND a.expires_at>now() AND ${notebookAttemptMembership('a')}`,
    [id, ownerId],
  );
  if (!attempt)
    throw new GameError(
      "Diese Übung ist abgelaufen oder wurde bereits beantwortet. Starte eine neue Aufgabe.",
      409,
    );
  const question=attempt.question as LearningQuestion;
  if(remembered!==undefined&&(attempt.practice_mode!=='flashcard'||!attempt.revealed_at))throw new GameError('Bitte die Lernkarte zuerst aufdecken.',422);
  const correct=remembered??gradeLearning(question,answer);
  const rows = await sql.query(
    `WITH claimed AS (UPDATE learning_attempts a SET consumed_at=now(),correct=$3 WHERE a.id=$1 AND a.owner_id=$2 AND a.consumed_at IS NULL AND a.expires_at>now() AND ${notebookAttemptMembership('a')} AND EXISTS(SELECT 1 FROM content_entries e WHERE e.id=a.entry_id AND e.revision=a.revision AND e.deleted_at IS NULL) RETURNING a.*), saved AS (INSERT INTO learning_progress(owner_id,entry_id,question_id,revision,streak,lapses,attempts,due_at) SELECT owner_id,entry_id,question_id,revision,CASE WHEN $3 THEN 1 ELSE 0 END,CASE WHEN $3 THEN 0 ELSE 1 END,1,now()+CASE WHEN $3 THEN interval '1 day' ELSE interval '10 minutes' END FROM claimed WHERE persistent ON CONFLICT(owner_id,entry_id,question_id) DO UPDATE SET revision=EXCLUDED.revision,streak=CASE WHEN $3 THEN CASE WHEN learning_progress.revision=EXCLUDED.revision THEN least(learning_progress.streak+1,8) ELSE 1 END ELSE 0 END,lapses=learning_progress.lapses+CASE WHEN $3 THEN 0 ELSE 1 END,attempts=learning_progress.attempts+1,updated_at=now(),due_at=now()+CASE WHEN NOT $3 THEN interval '10 minutes' WHEN learning_progress.revision<>EXCLUDED.revision THEN interval '1 day' ELSE (ARRAY[1,3,7,14,30,60,120,180])[least(learning_progress.streak+1,8)]*interval '1 day' END RETURNING due_at) SELECT id,(SELECT due_at FROM saved LIMIT 1) AS "dueAt" FROM claimed`,
    [id, ownerId, correct],
  );
  if (!rows.length)
    throw new GameError(
      "Diese Übung wurde bereits beantwortet oder geändert.",
      409,
    );
  return {
    correct,
    answers: question.answers,
    explanation: learningText(question.explanation, locale),
    dueAt: rows[0].dueAt,
  };
}
