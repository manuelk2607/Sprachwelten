import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { database, addEntry, gamePrompts } from "../db/repository";
import {
  startLearning,
  answerLearning,
  learningCatalog,
} from "../db/learning-repository";
import { learningSeeds } from "../lib/learning-seeds";
import { entryInput } from "../lib/content";
import {additionalGrammarSeeds} from '../lib/grammar-seeds';
const host = process.env.TEST_DATABASE_HOST,
  branch = process.env.TEST_NEON_BRANCH;
assert.ok(
  host &&
    host !== "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech" &&
    !host.includes("-pooler"),
  "An isolated direct TEST_DATABASE_HOST is required.",
);
if (branch) {
  assert.match(branch, /^br-[a-z0-9-]+$/);
  assert.notEqual(branch, "br-delicate-field-b96d9qc4");
  const url = execFileSync(
    "neon",
    [
      "connection-string",
      branch,
      "--project-id",
      "calm-tooth-60944868",
      "--database-name",
      "sprachspiel",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  assert.equal(new URL(url).hostname, host);
  process.env.DATABASE_URL = url;
}
assert.ok(process.env.DATABASE_URL);
assert.equal(new URL(process.env.DATABASE_URL).hostname, host);
const sql = database(),
  ids: string[] = [],
  owner = "qa-learning:" + crypto.randomUUID(),
  foreign = "qa-learning:" + crypto.randomUUID(),
  guest = "guest:qa-" + crypto.randomUUID(),
  topic = "QA " + crypto.randomUUID();
try {
  const seed = learningSeeds[0];
  assert.equal(seed.challenge?.type, "learning");
  const entry = await addEntry(
    entryInput.parse({
      ...seed,
      phrase: "QA " + crypto.randomUUID(),
      challenge: { ...seed.challenge, topic: { de: topic, en: topic } },
    }),
    owner,
    "Private QA name",
  );
  ids.push(entry.id);
  const filter = {
    language: entry.language,
    domain: "vocabulary" as const,
    topic,
  };
  const task = await startLearning(owner, true, filter, "de", false);
  assert.ok(!JSON.stringify(task).includes("answers"));
  assert.ok(!JSON.stringify(task).includes("explanation"));
  await assert.rejects(() => answerLearning(foreign, task.id, "apple", "de"));
  const submissions = await Promise.allSettled([
    answerLearning(owner, task.id, "apple", "de"),
    answerLearning(owner, task.id, "apple", "de"),
  ]);
  assert.equal(submissions.filter((s) => s.status === "fulfilled").length, 1);
  const catalog = await learningCatalog(filter, owner);
  assert.equal(catalog.entries[0].authorName, "");
  assert.equal(catalog.stats?.attempts, 1);
  assert.equal(catalog.stats?.due, 0);
  assert.equal((await learningCatalog(filter, foreign)).stats?.attempts, 0);
  await assert.rejects(() => startLearning(owner, true, filter, "de", true));
  const failed = await startLearning(owner, true, filter, "en", false);
  const result = await answerLearning(owner, failed.id, "wrong", "en");
  assert.equal(result.correct, false);
  assert.ok(result.explanation);
  assert.deepEqual(result.answers, ["apple"]);
  const stats = (await learningCatalog(filter, owner)).stats;
  assert.equal(stats?.attempts, 2);
  assert.equal(stats?.mistakes, 1);
  const anonymous = await startLearning(guest, false, filter, "en", false);
  await answerLearning(guest, anonymous.id, "apple", "en");
  assert.equal((await learningCatalog(filter, guest)).stats?.attempts, 0);
  const expired = await startLearning(owner, true, filter, "de", false);
  await sql`UPDATE learning_attempts SET expires_at=now()-interval '1 minute' WHERE id=${expired.id}`;
  await assert.rejects(() => answerLearning(owner, expired.id, "apple", "de"));
  const changed = await startLearning(owner, true, filter, "de", false);
  await sql`UPDATE content_entries SET revision=revision+1 WHERE id=${entry.id}`;
  await assert.rejects(() => answerLearning(owner, changed.id, "apple", "de"));
  const grammar=await addEntry(entryInput.parse({kind:'grammar',phrase:'QA Turkish '+crypto.randomUUID(),language:'tr',meaning:'A target-language case exercise.',challenge:{type:'learning',domain:'grammar',level:'A1',topic:{de:topic,en:topic},questions:[{id:'case',exercise:'writing',prompt:{de:'Schreibe das Wort klein.',en:'Write in lower case.'},answers:['ışık'],choices:[],explanation:{de:'Türkisch unterscheidet I und İ.',en:'Turkish distinguishes I and İ.'}}]}}),owner,'QA');
  ids.push(grammar.id);
  const grammarFilter={language:'tr',domain:'grammar' as const,topic};
  const grammarTask=await startLearning(owner,true,grammarFilter,'de',false);
  assert.equal(grammarTask.answerLanguage,'tr');
  assert.equal((await answerLearning(owner,grammarTask.id,'IŞIK','de')).correct,true);
  assert.equal((await learningCatalog(grammarFilter,owner)).entries.length,1);
  const englishGrammar=await learningCatalog({language:entry.language,domain:'grammar'},owner);
  assert.ok(!englishGrammar.topics.some(t=>t.de===topic),'Vocabulary topics must not appear as grammar filters.');
  for(const material of additionalGrammarSeeds){
    assert.equal(material.challenge?.type,'learning');
    const added=await addEntry(entryInput.parse({...material,phrase:'QA '+crypto.randomUUID(),challenge:{...material.challenge,topic:{de:topic,en:topic}}}),owner,'QA');ids.push(added.id);
    const task=await startLearning(owner,true,{language:material.language,domain:'grammar',topic},'en',false);
    const [own]=await sql`SELECT question FROM learning_attempts WHERE id=${task.id} AND owner_id=${owner}`;
    assert.equal((await answerLearning(owner,task.id,own.question.answers[0],'en')).correct,true);
  }
  for (const language of ["en", "de"]) {
    const card = await addEntry(
      entryInput.parse({
        kind: "tongue_twister",
        phrase: "QA tongue " + crypto.randomUUID(),
        language,
      }),
      owner,
      "QA",
    );
    ids.push(card.id);
  }
  const prompts = await gamePrompts("tongue-twisters", {
    gameLanguages: ["en"],
    pronunciationLanguage: "de",
  });
  assert.ok(prompts.length);
  assert.ok(prompts.every((p) => p.language === "en"));
  console.log(
    "PASS: isolated PostgreSQL learning persistence, owner separation, guest privacy, atomic concurrent grading, expiry/revision protection, scheduled reviews and SQL game-language filtering.",
  );
} finally {
  if (ids.length)
    await sql`DELETE FROM content_entries WHERE id=ANY(${ids}) AND author_id=${owner}`;
  assert.equal(
    (
      await sql`SELECT count(*)::int AS n FROM learning_progress WHERE owner_id=ANY(${[owner, foreign, guest]})`
    )[0].n,
    0,
  );
  console.log("PASS: all fixtures and dependent progress/attempts removed.");
}
