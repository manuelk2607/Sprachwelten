import type { Entry } from "../lib/content";
import type { TestPayload } from "./test-payload";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { createGame, act } from "../lib/game";
import { hashToken } from "../lib/http";
import { getEntry, insertRoom } from "../db/repository";
import { addEntry } from "../db/repository";
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
const grants: string[] = [],
  rooms: string[] = [],
  regionIds: string[] = [];
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
const clean = (entry: Entry) =>
  entryInput.parse({
    ...entry,
    audioId: entry.audioId ?? undefined,
    regionId: entry.regionId ?? undefined,
    contextId: entry.contextId ?? undefined,
    challenge: entry.challenge ?? undefined,
  });
async function create(phrase: string, kind = "idiom") {
  const r = await request(
    "/api/entries",
    "POST",
    { kind, phrase, language: "de", literal: "QA Übersetzung" },
    jars[1],
  );
  assert.equal(r.status, 201, JSON.stringify(r.data));
  ids.push(r.data.entry.id);
  return r.data.entry;
}
try {
  const probe = await addEntry(
    entryInput.parse({
      kind: "word",
      phrase: "QA-review-probe-" + stamp,
      language: "en",
      literal: "Testprobe",
    }),
    "qa-probe",
    "QA Review Test",
  );
  ids.push(probe.id);
  assert.equal(
    (await request("/api/entries/" + probe.id)).status,
    200,
    "The server must use the isolated database.",
  );
  for (const path of [
    "/api/me/entries",
    "/api/me/suggestions",
    "/api/admin/suggestions",
    "/api/admin/inbox",
  ])
    assert.equal((await request(path)).status, 401);
  for (let i = 0; i < 2; i++) {
    const r = await request(
      "/api/auth/sign-up/email",
      "POST",
      {
        email: `qa-review-${stamp}-${i}@sprachwelten.invalid`,
        password: crypto.randomUUID() + "!Aa1",
        name: "QA Review " + i,
      },
      jars[i],
    );
    assert.equal(r.status, 200, JSON.stringify(r.data));
    if (i === 0) adminId = r.data.user.id;
  }
  const entry = await create("QA-review-" + stamp),
    id = entry.id,
    input = clean(entry),
    edit = {
      ...input,
      literal: "Eigene Bearbeitung",
      revision: 0,
      authorId: adminId,
    };
  assert.equal(
    (await request("/api/me/entries/" + id, "PATCH", edit)).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/me/entries/" + id,
        "PATCH",
        edit,
        jars[1],
        "https://wrong.invalid",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/me/entries/" + id, "PATCH", edit, jars[1])).status,
    200,
  );
  assert.equal(
    (await request("/api/me/entries/" + id, "PATCH", edit, jars[1])).status,
    409,
  );
  assert.equal(
    (await request("/api/me/entries", "GET", undefined, jars[1])).data
      .entries[0].id,
    id,
  );
  assert.ok(
    !(await request("/api/me/entries")).data.entries.some((e) => e.id === id),
  );
  assert.equal(
    (await request("/api/entries/" + id, "GET", undefined, jars[1])).data
      .canEdit,
    true,
  );
  assert.equal((await request("/api/entries/" + id)).data.canSuggest, true);
  const proposal = {
    ...input,
    literal: "Vorschlag",
    revision: 1,
    note: "Bitte korrigieren.",
  };
  assert.equal(
    (
      await request(
        "/api/entries/" + id + "/suggestions",
        "POST",
        proposal,
        jars[1],
      )
    ).status,
    422,
  );
  const suggested = await request(
    "/api/entries/" + id + "/suggestions",
    "POST",
    proposal,
  );
  assert.equal(suggested.status, 201, JSON.stringify(suggested.data));
  assert.equal(
    (await request("/api/entries/" + id + "/suggestions", "POST", proposal))
      .status,
    409,
  );
  assert.equal(
    (await request("/api/entries/" + id)).data.entry.literal,
    "Eigene Bearbeitung",
  );
  for (const path of ["/api/admin/suggestions", "/api/admin/inbox"])
    assert.equal((await request(path)).status, 403);
  assert.equal(
    (await request("/api/admin/inbox", "POST", { action: "seen", entryId: id }))
      .status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/suggestions/" + suggested.data.id, "PATCH", {
        action: "accept",
        revision: 0,
      })
    ).status,
    403,
  );
  await sql`INSERT INTO app_admins(user_id) VALUES (${adminId})`;
  grants.push(adminId);
  const pending = await request("/api/admin/suggestions");
  assert.equal(pending.status, 200);
  assert.ok(
    pending.data.suggestions.some(
      (s) => s.id === suggested.data.id && s.note === "Bitte korrigieren.",
    ),
  );
  const approve = await request(
    "/api/admin/suggestions/" + suggested.data.id,
    "PATCH",
    {
      action: "accept",
      revision: 0,
      input: { ...input, literal: "Vom Admin angepasst" },
      note: "Private interne Notiz",
      feedback: "Danke, übernommen.",
    },
  );
  assert.equal(approve.status, 200, JSON.stringify(approve.data));
  assert.equal(
    (await request("/api/entries/" + id)).data.entry.literal,
    "Vom Admin angepasst",
  );
  assert.equal((await request("/api/entries/" + id)).data.entry.authorName, "");
  assert.equal(
    (
      await request("/api/admin/suggestions/" + suggested.data.id, "PATCH", {
        action: "accept",
        revision: 0,
      })
    ).status,
    409,
  );
  const [accepted] =
    await sql`SELECT status,admin_note FROM entry_suggestions WHERE id=${suggested.data.id}`;
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.admin_note, "Private interne Notiz");
  const own = (await request("/api/me/suggestions")).data.suggestions.find(
    (s) => s.id === suggested.data.id,
  );
  assert.ok(own);
  assert.equal(own.status, "accepted");
  assert.equal(own.feedback, "Danke, übernommen.");
  assert.ok(!JSON.stringify(own).includes("Private interne Notiz"));
  assert.ok(
    !(
      await request("/api/me/suggestions", "GET", undefined, jars[1])
    ).data.suggestions.some((s) => s.id === suggested.data.id),
  );
  const stale = await request("/api/entries/" + id + "/suggestions", "POST", {
    ...input,
    literal: "Alt",
    revision: 2,
  });
  assert.equal(stale.status, 201);
  assert.equal(
    (
      await request(
        "/api/me/entries/" + id,
        "PATCH",
        { ...input, literal: "Neu", revision: 2 },
        jars[1],
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/admin/suggestions/" + stale.data.id, "PATCH", {
        action: "accept",
        revision: 0,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/api/admin/suggestions/" + stale.data.id, "PATCH", {
        action: "reject",
        revision: 0,
        note: "Interne Ablehnungsnotiz",
        feedback: "Bitte auf der aktuellen Fassung aufbauen.",
      })
    ).status,
    200,
  );
  assert.equal((await request("/api/entries/" + id)).data.entry.literal, "Neu");
  const a = await create("QA-bulk-a-" + stamp),
    b = await create("QA-bulk-b-" + stamp),
    selection = [a, b].map((e) => ({ id: e.id, revision: 0 }));
  assert.equal(
    (
      await request(
        "/api/admin/bulk",
        "POST",
        { entries: selection, kind: "dialect", regionId: "ch" },
        jars[1],
      )
    ).status,
    403,
  );
  const bulk = await request("/api/admin/bulk", "POST", {
    entries: selection,
    kind: "dialect",
    regionId: "ch",
  });
  assert.equal(bulk.status, 200, JSON.stringify(bulk.data));
  for (const e of [a, b]) {
    const changed = (await request("/api/entries/" + e.id)).data.entry;
    assert.equal(changed.kind, "dialect");
    assert.equal(changed.regionId, "ch");
    assert.equal(changed.revision, 1);
  }
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        entries: [
          { id: a.id, revision: 1 },
          { id: b.id, revision: 0 },
        ],
        regionId: "at",
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/api/entries/" + a.id)).data.entry.regionId,
    "ch",
  );
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        entries: selection,
        regionId: "fake-region",
      })
    ).status,
    422,
  );
  const x = await create("QA-bulk-conflict-" + stamp),
    y = await create(x.phrase, "word");
  assert.equal(
    (
      await request("/api/admin/bulk", "POST", {
        entries: [x, y].map((e) => ({ id: e.id, revision: 0 })),
        kind: "idiom",
      })
    ).status,
    409,
  );
  assert.equal((await request("/api/entries/" + y.id)).data.entry.kind, "word");
  assert.equal((await request("/api/entries/" + x.id)).data.entry.revision, 0);
  // Suggested recordings remain private until approval and survive the form's upload cleanup.
  const wave = encodeAudioWave(
    Float32Array.from(
      { length: 1600 },
      (_, i) => Math.sin((2 * Math.PI * 220 * i) / 16000) * 0.1,
    ),
  );
  const uploaded = await fetch(base + "/api/audio", {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "audio/wav",
      Cookie: [...jars[0]].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: wave,
  });
  assert.equal(uploaded.status, 201);
  const audio = ((await uploaded.json()) as TestPayload).audio.id;
  audioIds.push({ id: audio, jar: jars[0] });
  assert.equal(
    (
      await request(
        "/api/entries/" + id + "/suggestions",
        "POST",
        { ...input, revision: 3, audioId: audio, presentation: "both" },
        jars[1],
      )
    ).status,
    422,
    "The owner cannot submit their own suggestion.",
  );
  const audioSuggestion = await request(
    "/api/entries/" + id + "/suggestions",
    "POST",
    { ...input, revision: 3, audioId: audio, presentation: "both" },
  );
  assert.equal(
    audioSuggestion.status,
    201,
    JSON.stringify(audioSuggestion.data),
  );
  assert.equal(
    (await request("/api/audio/" + audio, "DELETE", {})).data.removed,
    false,
  );
  assert.equal(
    (await request("/api/audio/" + audio, "GET", undefined, new Map())).status,
    404,
  );
  const [audioOwner] =
    await sql`SELECT owner_id FROM pronunciation_audio WHERE id=${audio}`;
  assert.equal(audioOwner.owner_id, adminId);
  assert.equal(
    (
      await request(
        "/api/admin/suggestions/" + audioSuggestion.data.id,
        "PATCH",
        { action: "accept", revision: 0 },
      )
    ).status,
    200,
  );
  assert.equal((await fetch(base + "/api/audio/" + audio)).status, 200);
  // A room snapshot retains audio even after contribution removal. Future IDs
  // and unrelated visitors cannot use the room-scoped media credential.
  const roomToken = "b".repeat(64),
    snapshot = createGame(
      "Q" + String(stamp).slice(-5),
      {
        id: crypto.randomUUID(),
        name: "Audio QA",
        score: 0,
        tokenHash: await hashToken(roomToken),
      },
      "de",
      "idiom-bluff",
    );
  for (const name of ["Second", "Third"])
    snapshot.players.push({
      id: crypto.randomUUID(),
      name,
      score: 0,
      tokenHash: crypto.randomUUID(),
    });
  act(snapshot, snapshot.hostId, { action: "configure", rounds: 1 });
  act(snapshot, snapshot.hostId, { action: "start" }, [(await getEntry(id))!]);
  await insertRoom(snapshot);
  rooms.push(snapshot.code);
  const roomRead = await fetch(base + "/api/rooms/" + snapshot.code, {
    headers: { Authorization: "Bearer " + roomToken },
  });
  assert.equal(roomRead.status, 200);
  const mediaCookie = roomRead.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
    mediaUrl = base + "/api/rooms/" + snapshot.code + "/audio/" + audio;
  assert.equal((await fetch(mediaUrl)).status, 401);
  assert.equal(
    (await fetch(mediaUrl, { headers: { Cookie: mediaCookie } })).status,
    200,
  );
  assert.equal(
    (await request("/api/me/entries/" + id, "DELETE", { revision: 4 }, jars[1]))
      .status,
    200,
  );
  assert.equal((await fetch(base + "/api/audio/" + audio)).status, 404);
  const playable = await fetch(mediaUrl, {
    headers: { Cookie: mediaCookie, Range: "bytes=0-43" },
  });
  assert.equal(playable.status, 206);
  assert.equal((await playable.arrayBuffer()).byteLength, 44);
  assert.equal(
    (
      await fetch(
        base + "/api/rooms/" + snapshot.code + "/audio/" + crypto.randomUUID(),
        { headers: { Cookie: mediaCookie } },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await request("/api/admin/entries/" + id, "DELETE", {
        revision: 5,
        restore: true,
      })
    ).status,
    200,
  );
  const leave = await fetch(base + "/api/rooms/" + snapshot.code, {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Authorization: "Bearer " + roomToken,
    },
    body: JSON.stringify({ action: "leave" }),
  });
  assert.equal(leave.status, 200);
  assert.ok(leave.headers.get("Set-Cookie")?.includes("Max-Age=0"));
  assert.equal(
    (await fetch(mediaUrl, { headers: { Cookie: mediaCookie } })).status,
    404,
  );
  const rejectedOwn = (
    await request("/api/me/suggestions")
  ).data.suggestions.find((s) => s.id === stale.data.id);
  assert.ok(rejectedOwn);
  assert.equal(rejectedOwn.status, "rejected");
  assert.equal(
    rejectedOwn.feedback,
    "Bitte auf der aktuellen Fassung aufbauen.",
  );
  assert.ok(!JSON.stringify(rejectedOwn).includes("Interne Ablehnungsnotiz"));
  // Custom regions, multiple meanings, display-name fallback and owner deletion.
  const newRegion = await request("/api/regions", "POST", {
    de: "QA Region " + stamp,
    en: "QA region " + stamp,
  });
  assert.equal(newRegion.status, 201);
  regionIds.push(newRegion.data.id);
  assert.equal(
    (await request("/api/regions", "POST", { de: "QA Region " + stamp })).data
      .id,
    newRegion.data.id,
  );
  assert.equal(
    (await request("/api/regions", "POST", { de: "<script>bad</script>" }))
      .status,
    422,
  );
  assert.equal(
    (await request("/api/regions")).data.regions[newRegion.data.id].en,
    "QA region " + stamp,
  );
  const regional = await request(
    "/api/entries",
    "POST",
    {
      kind: "dialect",
      phrase: "QA regional " + stamp,
      language: "de",
      literal: "Test",
      regionId: newRegion.data.id,
    },
    jars[1],
  );
  assert.equal(regional.status, 201, JSON.stringify(regional.data));
  ids.push(regional.data.entry.id);
  assert.equal(regional.data.entry.region, "QA Region " + stamp);
  assert.equal(
    (
      await request(
        "/api/entries",
        "POST",
        {
          kind: "dialect",
          phrase: "QA bad region " + stamp,
          language: "de",
          literal: "Test",
          regionId: "custom-0000000000000000",
        },
        jars[1],
      )
    ).status,
    422,
  );
  const variants = [];
  for (const sense of ["Sitzmöbel", "Geldinstitut"]) {
    const r = await request(
      "/api/entries",
      "POST",
      {
        kind: "word",
        phrase: "QA Bank " + stamp,
        language: "de",
        literal: sense,
        sense,
      },
      jars[1],
    );
    assert.equal(r.status, 201);
    ids.push(r.data.entry.id);
    variants.push(r.data.entry);
  }
  assert.equal(
    (
      await request(
        "/api/entries",
        "POST",
        {
          kind: "word",
          phrase: "QA Bank " + stamp,
          language: "de",
          literal: "Noch einmal",
          sense: "SITZMÖBEL!",
        },
        jars[1],
      )
    ).status,
    409,
  );
  const victim = variants[0];
  assert.equal(
    (await request("/api/me/entries/" + victim.id, "DELETE", { revision: 0 }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/me/entries/" + victim.id,
        "DELETE",
        { revision: 99 },
        jars[1],
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        "/api/me/entries/" + victim.id,
        "DELETE",
        { revision: 0 },
        jars[1],
      )
    ).status,
    200,
  );
  assert.equal((await request("/api/entries/" + victim.id)).status, 404);
  assert.equal(
    (
      await request("/api/admin/entries/" + victim.id, "DELETE", {
        revision: 1,
        restore: true,
      })
    ).status,
    200,
  );
  const fallback = await request("/api/rooms", "POST", {
    name: "",
    mode: "joke-quiz",
    locale: "en",
  });
  assert.equal(fallback.status, 201, JSON.stringify(fallback.data));
  rooms.push(fallback.data.room.code);
  assert.equal(fallback.data.room.players[0].name, "QA Review 0");
  const started = await fetch(base + "/api/rooms/" + fallback.data.room.code, {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Authorization: "Bearer " + fallback.data.token,
    },
    body: JSON.stringify({ action: "start" }),
  });
  assert.equal(started.status, 200);
  const startedData = (await started.json()) as TestPayload;
  assert.equal(startedData.room.options.length, 4);
  assert.ok(startedData.room.options.every((o) => !("correct" in o)));
  assert.equal(startedData.room.revelation, null);
  assert.equal(
    (
      await request(
        "/api/rooms",
        "POST",
        { name: "", mode: "joke-quiz" },
        new Map(),
      )
    ).status,
    422,
  );
  const inbox = await request("/api/admin/inbox");
  assert.ok(inbox.data.events.some((e) => e.id === id));
  assert.ok(inbox.data.unreadCount > 0);
  const badgeBefore = (await request("/api/admin/access")).data.unreadCount;
  const individual = await request("/api/admin/inbox", "POST", {
    action: "seen",
    entryId: id,
  });
  assert.equal(individual.status, 200);
  const afterRead = await request("/api/admin/inbox");
  assert.equal(afterRead.data.events.find((e) => e.id === id)?.unread, false);
  const phrase = afterRead.data.events.find((e) => e.id === id)!.phrase;
  const filter = new URLSearchParams({
    q: phrase,
    unread: "true",
    adminId: crypto.randomUUID(),
  });
  const unreadEntries = await request("/api/admin/entries?" + filter);
  assert.equal(unreadEntries.status, 200);
  assert.ok(!unreadEntries.data.entries.some((entry) => entry.id === id));
  filter.set("unread", "false");
  const allEntries = await request("/api/admin/entries?" + filter);
  assert.equal(allEntries.status, 200);
  assert.ok(allEntries.data.entries.some((entry) => entry.id === id));
  assert.equal(afterRead.data.unreadCount, inbox.data.unreadCount - 1);
  assert.equal(
    (await request("/api/admin/access")).data.unreadCount,
    badgeBefore - 1,
  );
  assert.equal(
    (await request("/api/admin/inbox", "POST", { action: "seen", entryId: id }))
      .status,
    200,
  );
  assert.equal(
    (await request("/api/admin/inbox")).data.unreadCount,
    afterRead.data.unreadCount,
  );
  assert.equal(
    (
      await request("/api/admin/inbox", "POST", {
        action: "seen",
        entryId: "invalid",
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request("/api/admin/inbox", "POST", {
        action: "seen",
        entryId: crypto.randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(
        "/api/admin/inbox",
        "POST",
        { action: "seen", entryId: id },
        jars[0],
        "https://other.invalid",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/admin/inbox", "POST", { action: "seen" })).status,
    200,
  );
  assert.equal((await request("/api/admin/inbox")).data.unreadCount, 0);
  const [audit] =
    await sql`SELECT count(*)::int AS total FROM moderation_events WHERE entry_id=${id} AND action='edit-own'`;
  assert.equal(audit.total, 2);
  console.log(
    "PASS: ownership, private suggestions, review edits, rejection, stale/concurrent revisions, audit, atomic bulk edits, duplicate rollback, canonical regions, inbox read state, protected audio, custom regions, multiple meanings, own deletion/restore, nickname fallback and live joke rooms.",
  );
} finally {
  for (const code of rooms)
    await sql`DELETE FROM game_rooms WHERE code=${code}`;
  for (const id of grants)
    await sql`DELETE FROM app_admins WHERE user_id=${id}`;
  if (adminId) await sql`DELETE FROM admin_inbox_seen WHERE user_id=${adminId}`;
  if (adminId)
    await sql`DELETE FROM admin_inbox_reads WHERE user_id=${adminId}`;
  for (const id of ids) {
    await sql`DELETE FROM entry_suggestions WHERE entry_id=${id}`;
    await sql`DELETE FROM moderation_events WHERE entry_id=${id}`;
    await sql`DELETE FROM content_entries WHERE id=${id}`;
  }
  for (const id of regionIds)
    await sql`DELETE FROM content_regions WHERE id=${id}`;
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
