import type { TestPayload } from "./test-payload";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import {
  audioSampleRate,
  encodeAudioWave,
  maxAudioBytes,
} from "../lib/audio-format";
const base = process.env.TEST_BASE_URL ?? "http://localhost:5176";
const expected = process.env.COMMUNITY_TEST_DATABASE_HOST;
assert.ok(
  expected && new URL(process.env.DATABASE_URL_UNPOOLED!).hostname === expected,
  "Set COMMUNITY_TEST_DATABASE_HOST to the isolated QA database host.",
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
const cookies = new Map<string, string>();
const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
async function call(path: string, data?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: {
      ...(data ? { "Content-Type": "application/json", Origin: base } : {}),
      Cookie: cookieHeader(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const index = pair.indexOf("=");
    cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
  return { status: res.status, data: (await res.json()) as TestPayload };
}
const entries: string[] = [];
const audioIds: string[] = [];
const rooms: string[] = [];
const stamp = Date.now();
let firstCookies = "";
const wave = new Uint8Array(
  encodeAudioWave(
    Float32Array.from(
      { length: audioSampleRate },
      (_, i) => Math.sin((2 * Math.PI * 440 * i) / audioSampleRate) * 0.1,
    ),
  ),
);
async function upload(
  bytes: Uint8Array,
  cookie = cookieHeader(),
  origin = base,
) {
  return fetch(base + "/api/audio", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie, "Content-Type": "audio/wav" },
    body: new Uint8Array(bytes).buffer,
  });
}
async function removeAudio(id: string) {
  return fetch(base + "/api/audio/" + id, {
    method: "DELETE",
    headers: { Origin: base, Cookie: firstCookies },
  });
}
try {
  const first = await call("/api/entries");
  const second = await call("/api/entries?offset=6");
  assert.equal(first.data.entries.length, 6);
  assert.equal(second.data.entries.length, 6);
  assert.equal(
    new Set([...first.data.entries, ...second.data.entries].map((e) => e.id))
      .size,
    12,
  );
  assert.equal(
    (await call("/api/languages?q=Koreanisch&locale=de")).data.languages.some(
      (l) => l.code === "ko",
    ),
    true,
  );
  assert.equal(
    (await call("/api/languages?code=bar&locale=en")).data.languages[0].code,
    "bar",
  );
  assert.equal(
    (await call("/api/languages?code=fake")).data.languages.length,
    0,
  );
  assert.equal((await upload(wave, "")).status, 401);
  const signup = await call("/api/auth/sign-up/email", {
    email: `qa-community-${stamp}@sprachwelten.invalid`,
    password: crypto.randomUUID() + "!aA1",
    name: "QA Community",
  });
  assert.equal(signup.status, 200, JSON.stringify(signup.data));
  const owner = signup.data.user.id;
  firstCookies = cookieHeader();
  assert.equal(
    (
      await call("/api/entries", {
        literal: "Test translation",
        kind: "word",
        phrase: "fake-" + stamp,
        language: "not-a-language",
      })
    ).status,
    422,
  );
  assert.equal(
    (await upload(wave, cookieHeader(), "https://wrong.invalid")).status,
    403,
  );
  assert.equal((await upload(new Uint8Array(44))).status, 422);
  assert.equal((await upload(new Uint8Array(maxAudioBytes + 1))).status, 413);
  const uploaded = await upload(wave);
  assert.equal(uploaded.status, 201, await uploaded.clone().text());
  const audio = ((await uploaded.json()) as TestPayload).audio;
  audioIds.push(audio.id);
  assert.equal(audio.durationMs, 1000);
  assert.equal((await fetch(base + "/api/audio/" + audio.id)).status, 404);
  const added = await call("/api/entries", {
    literal: "Test translation",
    kind: "word",
    phrase: `안녕-QA-${stamp}`,
    language: "ko",
    creditName: "QA Oma",
    audioId: audio.id,
    authorId: "forged-id",
    authorName: "Forged author",
  });
  assert.equal(added.status, 201, JSON.stringify(added.data));
  entries.push(added.data.entry.id);
  assert.equal(added.data.entry.creditName, "QA Oma");
  assert.equal(added.data.entry.authorName, "");
  assert.ok(added.data.entry.languageNames.en);
  const stored =
    await sql`SELECT author_id FROM content_entries WHERE id=${added.data.entry.id}`;
  assert.equal(stored[0].author_id, owner);
  const publicAudio = await fetch(base + "/api/audio/" + audio.id);
  assert.equal(publicAudio.status, 200);
  assert.equal((await publicAudio.arrayBuffer()).byteLength, wave.byteLength);
  assert.ok(!publicAudio.headers.get("content-disposition")!.includes("ko"));
  const range = await fetch(base + "/api/audio/" + audio.id, {
    headers: { Range: "bytes=10-19" },
  });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 10);
  assert.equal(
    range.headers.get("content-range"),
    `bytes 10-19/${wave.byteLength}`,
  );
  const suffix = await fetch(base + "/api/audio/" + audio.id, {
    headers: { Range: "bytes=-20" },
  });
  assert.equal(suffix.status, 206);
  assert.equal((await suffix.arrayBuffer()).byteLength, 20);
  assert.equal(
    (
      await fetch(base + "/api/audio/" + audio.id, {
        headers: { Range: "bytes=999999-" },
      })
    ).status,
    416,
  );
  assert.equal(
    ((await (await removeAudio(audio.id)).json()) as TestPayload).removed,
    false,
  );
  const temporary = await upload(wave);
  assert.equal(temporary.status, 201);
  const temporaryId = ((await temporary.json()) as TestPayload).audio.id;
  audioIds.push(temporaryId);
  assert.equal(
    ((await (await removeAudio(temporaryId)).json()) as TestPayload).removed,
    true,
  );
  cookies.clear();
  const other = await call("/api/auth/sign-up/email", {
    email: `qa-other-${stamp}@sprachwelten.invalid`,
    password: crypto.randomUUID() + "!aA1",
    name: "QA Other",
  });
  assert.equal(other.status, 200);
  assert.equal(
    (
      await call("/api/entries", {
        literal: "Test translation",
        kind: "word",
        phrase: "Foreign-audio-" + stamp,
        language: "de",
        audioId: audio.id,
      })
    ).status,
    422,
  );
  await call("/api/auth/sign-out", {});
  const host = await call("/api/rooms", {
    name: "QA Host",
    mode: "language-quiz",
    locale: "en",
  });
  assert.equal(host.status, 201);
  const code = host.data.room.code;
  rooms.push(code);
  const tokens = [host.data.token];
  for (const name of ["QA First", "QA Second"]) {
    const joined = await call(`/api/rooms/${code}/join`, { name });
    assert.equal(joined.status, 201);
    tokens.push(joined.data.token);
  }
  assert.equal(
    (
      await call(
        `/api/rooms/${code}`,
        { action: "configure", rounds: 11 },
        tokens[0],
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await call(
        `/api/rooms/${code}`,
        { action: "configure", rounds: 10 },
        tokens[0],
      )
    ).status,
    200,
  );
  await call(
    `/api/rooms/${code}`,
    { action: "configure", rounds: 1 },
    tokens[0],
  );
  let current = await call(
    `/api/rooms/${code}`,
    { action: "start" },
    tokens[0],
  );
  assert.equal(current.status, 200);
  const match = current.data.room.matchId;
  // Restrict the synthetic room's current card to the newly uploaded entry, so projection is deterministic.
  const [fixture] = await sql`SELECT state FROM game_rooms WHERE code=${code}`;
  fixture.state.round.entry = added.data.entry;
  await sql`UPDATE game_rooms SET state=${JSON.stringify(fixture.state)}::jsonb,version=version+1 WHERE code=${code}`;
  current = await call(`/api/rooms/${code}`, undefined, tokens[0]);
  assert.equal(current.data.room.prompt.audioId, audio.id);
  assert.ok(!("language" in current.data.room.prompt));
  assert.ok(!("languageNames" in current.data.room.prompt));
  assert.equal(current.data.room.revelation, null);
  assert.ok(!("prompts" in current.data.room));
  assert.equal(
    (await call(`/api/rooms/${code}`, { action: "leave" }, tokens[0])).status,
    200,
  );
  assert.equal(
    (await call(`/api/rooms/${code}`, undefined, tokens[0])).status,
    403,
  );
  current = await call(`/api/rooms/${code}`, undefined, tokens[1]);
  assert.equal(current.data.room.hostId, current.data.room.playerId);
  assert.equal(current.data.room.players.length, 2);
  const option = current.data.room.options[0].id;
  await Promise.all(
    tokens
      .slice(1)
      .map((token) =>
        call(`/api/rooms/${code}`, { action: "vote", optionId: option }, token),
      ),
  );
  current = await call(`/api/rooms/${code}`, { action: "next" }, tokens[1]);
  assert.equal(current.data.room.phase, "finished");
  assert.equal(
    (
      await call(
        `/api/rooms/${code}`,
        { action: "restart", rounds: 2 },
        tokens[2],
      )
    ).status,
    403,
  );
  current = await call(
    `/api/rooms/${code}`,
    { action: "restart", rounds: 2 },
    tokens[1],
  );
  assert.equal(current.status, 200);
  assert.equal(current.data.room.phase, "lobby");
  assert.notEqual(current.data.room.matchId, match);
  assert.equal(current.data.room.totalRounds, 2);
  assert.ok(current.data.room.players.every((p) => p.score === 0));
  current = await call(`/api/rooms/${code}`, { action: "start" }, tokens[1]);
  assert.equal(current.data.room.phase, "voting");
  await call(`/api/rooms/${code}`, { action: "heartbeat" }, tokens[2]);
  const prompts =
    await sql`SELECT jsonb_array_length(state->'prompts') AS count FROM game_rooms WHERE code=${code}`;
  assert.equal(prompts[0].count, 2);
  await sql`UPDATE game_rooms SET state=jsonb_set(state,'{players,0,lastSeenAt}',to_jsonb(${Date.now() - 121000}::bigint)),version=version+1 WHERE code=${code}`;
  current = await call(
    `/api/rooms/${code}`,
    { action: "heartbeat" },
    tokens[2],
  );
  assert.equal(current.status, 200);
  assert.equal(current.data.room.players.length, 1);
  assert.equal(current.data.room.hostId, current.data.room.playerId);
  console.log(
    "PASS: pagination, registered languages, attribution, audio authentication/ownership/validation/private drafts/public playback/ranges, round limits, host transfer, rematch, prompt persistence and disconnect recovery.",
  );
} finally {
  for (const id of entries)
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  for (const id of audioIds) await removeAudio(id);
  for (const code of rooms)
    await sql`DELETE FROM game_rooms WHERE code=${code}`;
  await fetch(base + "/api/auth/sign-out", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: firstCookies,
    },
    body: "{}",
  });
}
