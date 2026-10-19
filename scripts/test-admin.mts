import type { TestPayload } from "./test-payload";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { addEntry, gamePrompts } from "../db/repository";
import { entryInput } from "../lib/content";
import { encodeAudioWave } from "../lib/audio-format";
const base = process.env.TEST_BASE_URL ?? "http://localhost:5176",
  host = process.env.TEST_DATABASE_HOST;
assert.ok(
  host && new URL(process.env.DATABASE_URL_UNPOOLED!).hostname === host,
  "Use the isolated QA database.",
);
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Use a local QA server.",
);
assert.equal(
  process.env.TEST_ADMIN_APPROVED,
  "1",
  "Explicit user authorization is required for the temporary QA admin grant.",
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!),
  stamp = Date.now(),
  ids: string[] = [],
  jars = [new Map<string, string>(), new Map<string, string>()];
let adminId = "";
const grants: string[] = [];
const audioIds: { id: string; jar: Map<string, string> }[] = [];
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  jar = jars[0],
  origin = base,
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json", Origin: origin } : {}),
      Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";"),
      i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
  const raw = await res.text();
  let parsed: TestPayload;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { error: raw.slice(0, 120) } as TestPayload;
  }
  return { status: res.status, data: parsed };
}
try {
  // Prove the local server uses the same isolated database before granting any test rights.
  const probe = await addEntry(
    entryInput.parse({
      kind: "word",
      phrase: "QA-admin-probe-" + stamp,
      language: "en",
      literal: "Testprobe",
    }),
    "qa-probe",
    "QA Admin Test",
  );
  ids.push(probe.id);
  assert.equal((await request("/api/entries/" + probe.id)).status, 200);
  assert.equal((await request("/api/admin/entries")).status, 401);
  assert.equal((await request("/api/admin/users")).status, 401);
  for (let i = 0; i < 2; i++) {
    const signup = await request(
      "/api/auth/sign-up/email",
      "POST",
      {
        email: `qa-admin-${stamp}-${i}@sprachwelten.invalid`,
        password: crypto.randomUUID() + "!Aa1",
        name: "QA Admin Test " + i,
      },
      jars[i],
    );
    assert.equal(signup.status, 200, JSON.stringify(signup.data));
    if (i === 0) adminId = signup.data.user.id;
  }
  assert.equal((await request("/api/admin/entries")).status, 403);
  assert.equal((await request("/api/admin/users")).status, 403);
  assert.equal((await request("/api/admin/access")).data.isAdmin, false);
  await sql`INSERT INTO app_admins(user_id) VALUES (${adminId})`;
  grants.push(adminId);
  assert.equal((await request("/api/admin/access")).data.isAdmin, true);
  const posted = await request(
    "/api/entries",
    "POST",
    {
      kind: "dialect",
      phrase: "QA-admin-head-" + stamp,
      language: "de",
      regionId: "ch",
      literal: "Kopf",
      meaning: "",
      creditName: "",
      authorName: "Forged",
    },
    jars[1],
  );
  assert.equal(posted.status, 201, JSON.stringify(posted.data));
  const id = posted.data.entry.id;
  ids.push(id);
  assert.equal(posted.data.entry.authorName, "");
  assert.equal(posted.data.entry.creditName, "");
  assert.equal(posted.data.entry.meaning, "");
  assert.equal(
    (
      await request(
        "/api/entries",
        "POST",
        { kind: "word", phrase: "QA-missing-" + stamp, language: "en" },
        jars[1],
      )
    ).status,
    422,
  );
  const details = await request("/api/entries/" + id);
  assert.equal(details.data.entry.literal, "Kopf");
  assert.equal(details.data.entry.authorName, "");
  const preview = (
    await request(
      "/api/entries?q=" + encodeURIComponent("QA-admin-head-" + stamp),
    )
  ).data.entries[0];
  assert.deepEqual(Object.keys(preview).sort(), [
    "createdAt",
    "id",
    "kind",
    "phrase",
    "presentation",
    "status",
  ]);
  const listed = await request(
    "/api/admin/entries?q=" + encodeURIComponent("QA-admin-head-" + stamp),
  );
  assert.equal(listed.status, 200);
  const original = listed.data.entries[0];
  assert.equal(original.authorName, "QA Admin Test 1");
  assert.ok(original.authorId);
  assert.equal(original.revision, 0);
  const edit = {
    ...original,
    audioId: original.audioId ?? undefined,
    contextId: original.contextId ?? undefined,
    regionId: original.regionId ?? undefined,
    literal: "Haupt",
    meaning: "Auch als Kopf bekannt.",
    creditName: "QA Oma",
    revision: 0,
  };
  assert.equal(
    (await request("/api/admin/entries/" + id, "PATCH", edit, jars[1])).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/admin/entries/" + id,
        "PATCH",
        edit,
        jars[0],
        "https://wrong.invalid",
      )
    ).status,
    403,
  );
  const edited = await request("/api/admin/entries/" + id, "PATCH", edit);
  assert.equal(edited.status, 200, JSON.stringify(edited.data));
  assert.equal(
    (await request("/api/admin/entries/" + id, "PATCH", edit)).status,
    409,
    "Stale edits must not overwrite a newer version.",
  );
  const detail = await request("/api/entries/" + id);
  assert.equal(detail.data.entry.literal, "Haupt");
  assert.equal(detail.data.entry.creditName, "QA Oma");
  assert.equal(detail.data.entry.authorName, "");
  assert.equal(detail.data.entry.revision, 1);
  const owner = (
    await sql`SELECT author_id FROM content_entries WHERE id=${id}`
  )[0].author_id;
  assert.equal(
    owner,
    original.authorId,
    "Editing preserves the original account identity.",
  );
  // An administrator may retain a contribution's existing recording, but cannot steal private uploads.
  async function upload(jar: Map<string, string>, frequency: number) {
    const wave = encodeAudioWave(
      Float32Array.from(
        { length: 1600 },
        (_, i) => Math.sin((2 * Math.PI * frequency * i) / 16000) * 0.1,
      ),
    );
    const response = await fetch(base + "/api/audio", {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "audio/wav",
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: wave,
    });
    assert.equal(response.status, 201);
    const data = (await response.json()) as TestPayload;
    audioIds.push({ id: data.audio.id, jar });
    return data.audio.id;
  }
  const clip = await upload(jars[1], 220),
    privateClip = await upload(jars[1], 330),
    ownedClip = await upload(jars[0], 440);
  const spoken = await request(
    "/api/entries",
    "POST",
    {
      kind: "word",
      phrase: "QA-admin-audio-" + stamp,
      language: "en",
      literal: "Audio sample",
      presentation: "both",
      audioId: clip,
    },
    jars[1],
  );
  assert.equal(spoken.status, 201);
  ids.push(spoken.data.entry.id);
  const audioEdit = {
    ...spoken.data.entry,
    regionId: undefined,
    contextId: undefined,
    revision: 0,
  };
  assert.equal(
    (
      await request(
        "/api/admin/entries/" + spoken.data.entry.id,
        "PATCH",
        audioEdit,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/admin/entries/" + spoken.data.entry.id, "PATCH", {
        ...audioEdit,
        revision: 1,
        audioId: privateClip,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request("/api/admin/entries/" + spoken.data.entry.id, "PATCH", {
        ...audioEdit,
        revision: 1,
        audioId: ownedClip,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/admin/entries/" + spoken.data.entry.id, "PATCH", {
        ...audioEdit,
        revision: 2,
        presentation: "text",
        audioId: undefined,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/entries/" + spoken.data.entry.id)).data.entry.audioId,
    null,
  );
  const listedUsers = await request(
    "/api/admin/users?q=" + encodeURIComponent(`qa-admin-${stamp}`),
  );
  assert.equal(listedUsers.status, 200);
  assert.equal(listedUsers.data.users.length, 2);
  for (const user of listedUsers.data.users)
    assert.deepEqual(Object.keys(user).sort(), [
      "createdAt",
      "email",
      "emailVerified",
      "id",
      "isAdmin",
      "lastSignIn",
      "name",
    ]);
  assert.equal(
    (
      await request(
        "/api/admin/entries/" + id,
        "DELETE",
        { revision: 1 },
        jars[1],
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/admin/entries/" + id, "DELETE", { revision: 1 }))
      .status,
    200,
  );
  assert.equal((await request("/api/entries/" + id)).status, 404);
  assert.ok(!(await gamePrompts("dialect-detective")).some((e) => e.id === id));
  const trash = await request(
    "/api/admin/entries?removed=true&q=" +
      encodeURIComponent("QA-admin-head-" + stamp),
  );
  assert.equal(trash.data.entries[0].id, id);
  assert.equal(trash.data.entries[0].revision, 2);
  assert.equal(
    (
      await request("/api/admin/entries/" + id, "DELETE", {
        revision: 2,
        restore: true,
      })
    ).status,
    200,
  );
  assert.equal((await request("/api/entries/" + id)).status, 200);
  // Existing uniqueness applies to edits and restoring a removed contribution.
  const second = await request(
    "/api/entries",
    "POST",
    {
      kind: "dialect",
      phrase: "QA-admin-second-" + stamp,
      language: "de",
      regionId: "ch",
      literal: "Kopf",
    },
    jars[1],
  );
  assert.equal(second.status, 201);
  ids.push(second.data.entry.id);
  assert.equal(
    (
      await request("/api/admin/entries/" + id, "PATCH", {
        ...edit,
        revision: 3,
        phrase: second.data.entry.phrase,
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/api/admin/entries/" + id, "DELETE", { revision: 3 }))
      .status,
    200,
  );
  const replacement = await request(
    "/api/entries",
    "POST",
    {
      kind: "dialect",
      phrase: original.phrase,
      language: "de",
      regionId: "ch",
      literal: "Kopf",
    },
    jars[1],
  );
  assert.equal(replacement.status, 201);
  ids.push(replacement.data.entry.id);
  assert.equal(
    (
      await request("/api/admin/entries/" + id, "DELETE", {
        revision: 4,
        restore: true,
      })
    ).status,
    409,
  );
  const audit =
    await sql`SELECT action FROM moderation_events WHERE entry_id=${id}`;
  assert.deepEqual(audit.map((r) => r.action).sort(), [
    "edit",
    "remove",
    "remove",
    "restore",
  ]);
  await sql`DELETE FROM app_admins WHERE user_id=${adminId}`;
  grants.length = 0;
  assert.equal((await request("/api/admin/users")).status, 403);
  assert.equal((await request("/api/admin/access")).data.isAdmin, false);
  console.log(
    "PASS: opt-in attribution, required translation/optional explanation, answer-free previews, isolated admin authorization, user privacy, edit/CSRF/revision/identity safeguards, uniqueness, reversible deletion, restore conflicts, moderation audit, prompt exclusion and immediate admin revocation.",
  );
} finally {
  for (const id of grants)
    await sql`DELETE FROM app_admins WHERE user_id=${id}`;
  for (const id of ids) {
    await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  }
  for (const audio of audioIds)
    await fetch(base + "/api/audio/" + audio.id, {
      method: "DELETE",
      headers: {
        Origin: base,
        Cookie: [...audio.jar].map(([k, v]) => `${k}=${v}`).join("; "),
      },
    });
  for (const jar of jars)
    if (jar.size)
      await request("/api/auth/sign-out", "POST", {}, jar).catch(() => {});
}
