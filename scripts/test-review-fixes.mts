import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { addEntry, getEntry } from "../db/repository";
import { entryInput } from "../lib/content";
const base = process.env.TEST_BASE_URL ?? "http://localhost:5176";
assert.equal(
  new URL(process.env.DATABASE_URL_UNPOOLED!).hostname,
  process.env.TEST_DATABASE_HOST,
  "Use the isolated QA database.",
);
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert.equal(
  process.env.TEST_ADMIN_APPROVED,
  "1",
  "QA-only administrator permission is required.",
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!),
  stamp = Date.now(),
  ids: string[] = [],
  rooms: string[] = [],
  jar = new Map<string, string>();
let adminId = "";
type Result = {
  entry: NonNullable<Awaited<ReturnType<typeof getEntry>>>;
  user: { id: string };
  batchId: string;
  batches: { id: string; canUndo: boolean }[];
  room: { code: string; maxRounds: number; totalRounds: number; phase: string };
  token: string;
  error?: string;
};
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  token?: string,
  anonymous = false,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(data ? { Origin: base, "Content-Type": "application/json" } : {}),
      ...(anonymous
        ? {}
        : {
            Cookie: [...jar]
              .map(([key, value]) => key + "=" + value)
              .join("; "),
          }),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (!anonymous)
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"),
        index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
  return { status: response.status, data: (await response.json()) as Result };
}
const challenge = {
  type: "meaning",
  correctIndex: 2,
  choices: [
    { de: "Ich mache Licht.", en: "I turn on a light." },
    { de: "Ich gehe weg.", en: "I leave." },
    { de: "Ich verstehe es.", en: "I understand." },
    { de: "Ich repariere es.", en: "I repair it." },
  ],
};
const payload = (phrase: string) => ({
  kind: "idiom",
  phrase,
  language: "de",
  challenge,
});
try {
  const probe = await addEntry(
    entryInput.parse({
      kind: "word",
      phrase: "QA-review-fixes-probe-" + stamp,
      language: "en",
      literal: "Testprobe",
    }),
    "qa-probe",
    "QA",
  );
  ids.push(probe.id);
  assert.equal(
    (await request("/api/entries/" + probe.id)).status,
    200,
    "The server must use the isolated database.",
  );
  assert.equal(
    (await request("/api/admin/bulk", "GET", undefined, undefined, true))
      .status,
    401,
  );
  const signup = await request("/api/auth/sign-up/email", "POST", {
    email: `qa-review-fixes-${stamp}@sprachwelten.invalid`,
    password: crypto.randomUUID() + "!Aa1",
    name: "QA Review Fixes",
  });
  assert.equal(signup.status, 200, JSON.stringify(signup.data));
  adminId = signup.data.user.id;
  assert.equal((await request("/api/admin/bulk")).status, 403);
  await sql`INSERT INTO app_admins(user_id) VALUES (${adminId})`;
  for (const suffix of ["A", "B"]) {
    const created = await request(
      "/api/entries",
      "POST",
      payload(`QA meaning ${stamp} ${suffix}`),
    );
    assert.equal(created.status, 201, JSON.stringify(created.data));
    ids.push(created.data.entry.id);
  }
  const selected = ids.slice(1),
    selection = async () =>
      Promise.all(
        selected.map(async (id) => {
          const entry = await getEntry(id);
          assert.ok(entry);
          return { id, revision: entry.revision! };
        }),
      );
  const bulk = await request("/api/admin/bulk", "POST", {
    entries: await selection(),
    kind: "dialect",
    regionId: "at",
  });
  assert.equal(bulk.status, 200, JSON.stringify(bulk.data));
  for (const id of selected) {
    const entry = await getEntry(id);
    assert.equal(entry?.kind, "dialect");
    assert.deepEqual(entry?.challenge, challenge);
  }
  assert.ok(
    (await request("/api/admin/bulk")).data.batches.find(
      (batch) => batch.id === bulk.data.batchId,
    )?.canUndo,
  );
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        undoBatchId: bulk.data.batchId,
      })
    ).status,
    200,
  );
  for (const id of selected) {
    const entry = await getEntry(id);
    assert.equal(entry?.kind, "idiom");
    assert.deepEqual(entry?.challenge, challenge);
  }
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        undoBatchId: bulk.data.batchId,
      })
    ).status,
    409,
  );
  const revisions = await selection();
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        entries: revisions,
        kind: "tongue_twister",
      })
    ).status,
    422,
  );
  assert.deepEqual(await selection(), revisions);
  const changed = await request("/api/admin/bulk", "POST", {
    entries: revisions,
    kind: "dialect",
    regionId: "at",
  });
  assert.equal(changed.status, 200);
  const entry = await getEntry(selected[1]);
  assert.ok(entry);
  const input = entryInput.parse({
    ...entry,
    audioId: entry.audioId ?? undefined,
    regionId: entry.regionId ?? undefined,
    contextId: entry.contextId ?? undefined,
    challenge: entry.challenge ?? undefined,
  });
  assert.equal(
    (
      await request("/api/me/entries/" + entry.id, "PATCH", {
        ...input,
        revision: entry.revision,
        meaning: "Spätere Einzeländerung",
      })
    ).status,
    200,
  );
  const current = await selection();
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        undoBatchId: changed.data.batchId,
      })
    ).status,
    409,
  );
  assert.deepEqual(
    await selection(),
    current,
    "A failed undo must change none of the selected entries.",
  );
  const concurrent = await request("/api/admin/bulk", "POST", {
    entries: current,
    regionId: "ch",
  });
  assert.equal(concurrent.status, 200);
  const undos = await Promise.all([
    request("/api/admin/bulk", "POST", {
      undoBatchId: concurrent.data.batchId,
    }),
    request("/api/admin/bulk", "POST", {
      undoBatchId: concurrent.data.batchId,
    }),
  ]);
  assert.deepEqual(undos.map((result) => result.status).sort(), [200, 409]);
  for (const id of selected) assert.equal((await getEntry(id))?.regionId, "at");
  // A sentinel availability proves that rounds-only configuration does not reload
  // cards. Starting still checks the real database pool authoritatively.
  const created = await request("/api/rooms", "POST", {
    name: "QA Pool Cache",
    mode: "joke-quiz",
  });
  assert.equal(created.status, 201);
  const { code } = created.data.room;
  rooms.push(code);
  assert.ok(created.data.room.maxRounds >= 2);
  await sql`UPDATE game_rooms SET state=jsonb_set(jsonb_set(state,'{availableRounds}','1'::jsonb),'{totalRounds}','1'::jsonb) WHERE code=${code}`;
  assert.equal(
    (
      await request(
        "/api/rooms/" + code,
        "POST",
        { action: "configure", rounds: 2 },
        created.data.token,
      )
    ).status,
    422,
  );
  const configured = await request(
    "/api/rooms/" + code,
    "POST",
    { action: "configure", rounds: 1 },
    created.data.token,
  );
  assert.equal(configured.status, 200);
  assert.equal(configured.data.room.maxRounds, 1);
  const started = await request(
    "/api/rooms/" + code,
    "POST",
    { action: "start" },
    created.data.token,
  );
  assert.equal(started.status, 200);
  assert.equal(started.data.room.phase, "voting");
  await sql`DELETE FROM app_admins WHERE user_id=${adminId}`;
  assert.equal((await request("/api/admin/bulk")).status, 403);
  console.log(
    "PASS: QA-only bulk task preservation, blocked destructive conversions, reversible edits, atomic/stale/concurrent undo, administrator protection, cached round availability and authoritative start validation.",
  );
} finally {
  if (adminId) await sql`DELETE FROM app_admins WHERE user_id=${adminId}`;
  for (const code of rooms)
    await sql`DELETE FROM game_rooms WHERE code=${code}`;
  for (const id of ids) {
    await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  }
  if (jar.size) await request("/api/auth/sign-out", "POST", {}).catch(() => {});
}
