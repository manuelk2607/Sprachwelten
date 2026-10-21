import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { addEntry, gamePrompts } from "../db/repository";
import { adminEntries } from "../db/admin-repository";
import {
  addRoundReport,
  reports,
  resolveReport,
} from "../db/report-repository";
import { inboxCount } from "../db/community-repository";
import { entryInput } from "../lib/content";
import { hashToken } from "../lib/http";
const host = process.env.TEST_DATABASE_HOST!,
  base = process.env.TEST_BASE_URL ?? "http://localhost:5176";
assert.ok(host);
assert.notEqual(
  host,
  "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech",
);
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname, host);
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname.replace("-pooler.", "."),
  host,
);
assert.equal(new URL(base).hostname, "localhost");
assert.equal(process.env.TEST_ADMIN_APPROVED, "1");
const sql = neon(process.env.DATABASE_URL_UNPOOLED!),
  prefix = "QA-improvements-" + crypto.randomUUID(),
  owner = crypto.randomUUID(),
  ids: string[] = [],
  rooms: string[] = [],
  jar = new Map<string, string>();
let admin = "";
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  token?: string,
  cookies = false,
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(data ? { Origin: base, "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(cookies
        ? { Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; ") }
        : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (cookies)
    for (const raw of r.headers.getSetCookie()) {
      const [pair] = raw.split(";"),
        i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  return {
    status: r.status,
    data: (await r.json()) as Record<string, unknown>,
  };
}
try {
  const fixtures = [
    entryInput.parse({
      kind: "idiom",
      phrase: prefix + " idiom",
      language: "de",
      literal: "Eine Bedeutung",
      hint: "Ein Tipp",
      translation: { literal: "A meaning", hint: "A clue" },
      translationReviewed: true,
    }),
    entryInput.parse({
      kind: "attribution",
      phrase: prefix + " song",
      language: "en",
      challenge: {
        type: "attribution",
        category: "song",
        answer: "QA song",
        artist: "QA artist",
        alternatives: ["Wrong A", "Wrong B", "Wrong C"],
      },
    }),
    entryInput.parse({
      kind: "word",
      phrase: prefix + " word",
      language: "de",
      literal: "Noch nicht übersetzt",
    }),
  ];
  const entries = [];
  for (const input of fixtures) {
    const e = await addEntry(input, owner, "");
    entries.push(e);
    ids.push(e.id);
  }
  assert.deepEqual(
    (
      await adminEntries(prefix, false, 0, undefined, "missing-hint")
    ).entries.map((e) => e.id),
    [entries[1].id],
  );
  assert.deepEqual(
    (
      await adminEntries(prefix, false, 0, undefined, "missing-album")
    ).entries.map((e) => e.id),
    [entries[1].id],
  );
  assert.deepEqual(
    (
      await adminEntries(prefix, false, 0, undefined, "missing-translation")
    ).entries.map((e) => e.id),
    [entries[2].id],
  );
  assert.equal(
    (await adminEntries(prefix, false, 30, undefined, "missing-album")).entries
      .length,
    0,
  );
  const before = await inboxCount(owner),
    fingerprint = await hashToken(prefix);
  await Promise.all([
    addRoundReport(fingerprint, entries[0], "meaning-quiz", "answer", prefix),
    addRoundReport(fingerprint, entries[0], "meaning-quiz", "answer", prefix),
  ]);
  const own = (await reports(false)).filter((r) => r.note === prefix);
  assert.equal(own.length, 1);
  assert.equal(await inboxCount(owner), before + 1);
  await resolveReport(own[0].id, 0, true, owner);
  assert.equal(await inboxCount(owner), before);
  await assert.rejects(resolveReport(own[0].id, 0, false, owner), /inzwischen/);
  const pool = await gamePrompts("taboo", {
    locale: "en",
    tabooLanguages: ["de"],
  });
  assert.ok(pool.length >= 24);
  assert.ok(pool.every((e) => e.language === "de"));
  assert.equal(
    (await gamePrompts("taboo", { locale: "de", tabooLanguages: ["it"] }))
      .length,
    0,
  );
  if (process.argv.includes("--repository-only")) {
    console.log(
      "PASS: quality filtering before pagination, report idempotency and inbox counts, revision guards and SQL language filtering.",
    );
  } else {
    const created = await request("/api/rooms", "POST", {
      name: "QA Host",
      mode: "taboo",
      locale: "de",
      tabooLanguages: ["de"],
    });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const room = created.data.room as { code: string },
      token = created.data.token as string;
    rooms.push(room.code);
    const tokens = [token];
    for (let i = 1; i < 4; i++) {
      const joined = await request(
        "/api/rooms/" + room.code + "/join",
        "POST",
        { name: "QA Player " + i },
      );
      assert.equal(joined.status, 201);
      tokens.push(joined.data.token as string);
    }
    const path = "/api/rooms/" + room.code;
    await request(path, "POST", { action: "configure", rounds: 1 }, token);
    let r = await request(path, "POST", { action: "start" }, token);
    assert.equal(r.status, 200);
    let view = r.data.room as {
      matchId: string;
      roundNumber: number;
      taboo: { cardIndex: number; card: { word: string } };
    };
    const move = (event: string, text?: string) => ({
      action: "taboo",
      event,
      text,
      matchId: view.matchId,
      roundNumber: view.roundNumber,
      cardIndex: view.taboo.cardIndex,
    });
    const report = {
      matchId: view.matchId,
      roundNumber: view.roundNumber,
      reason: "answer",
      note: prefix,
    };
    assert.equal(
      (await request(path + "/reports", "POST", report, tokens[2])).status,
      409,
    );
    const hidden = (await request(path, "GET", undefined, tokens[2])).data
      .room as { prompt: { phrase: string }; taboo: { card: unknown } };
    assert.equal(hidden.prompt.phrase, "");
    assert.equal(hidden.taboo.card, null);
    assert.equal(
      (await request(path, "POST", move("start"), tokens[2])).status,
      403,
    );
    assert.equal(
      (await request(path, "POST", move("start"), token)).status,
      200,
    );
    const stale = move("guess", view.taboo.card.word);
    r = await request(path, "POST", stale, tokens[2]);
    assert.equal(r.status, 200);
    assert.equal((await request(path, "POST", stale, tokens[2])).status, 409);
    view = r.data.room as typeof view;
    await sql`UPDATE game_rooms SET state=jsonb_set(state,'{taboo,deadline}','0'::jsonb),version=version+1 WHERE code=${room.code}`;
    r = await request(path, "POST", move("timeout"), tokens[2]);
    assert.equal(r.status, 200);
    assert.equal(
      (await request(path + "/reports", "POST", report)).status,
      401,
    );
    assert.equal(
      (
        await request(
          path + "/reports",
          "POST",
          { ...report, entryId: crypto.randomUUID() },
          tokens[2],
        )
      ).status,
      422,
    );
    assert.equal(
      (await request(path + "/reports", "POST", report, tokens[2])).status,
      200,
    );
    assert.equal(
      (await request(path + "/reports", "POST", report, tokens[2])).status,
      200,
    );
    assert.equal((await request("/api/admin/reports")).status, 401);
    const signup = await request(
      "/api/auth/sign-up/email",
      "POST",
      {
        email: "qa-improvements-" + Date.now() + "@sprachwelten.invalid",
        password: crypto.randomUUID() + "!Aa1",
        name: "QA Improvements",
      },
      undefined,
      true,
    );
    assert.equal(signup.status, 200, JSON.stringify(signup.data));
    admin = (signup.data.user as { id: string }).id;
    assert.equal(
      (await request("/api/admin/reports", "GET", undefined, undefined, true))
        .status,
      403,
    );
    await sql`INSERT INTO app_admins(user_id) VALUES (${admin})`;
    const filtered = await request(
      "/api/admin/entries?q=" +
        encodeURIComponent(prefix) +
        "&quality=missing-album",
      "GET",
      undefined,
      undefined,
      true,
    );
    assert.equal(filtered.status, 200);
    assert.equal(
      (filtered.data.entries as { id: string }[])[0].id,
      entries[1].id,
    );
    assert.equal(
      (
        await request(
          "/api/admin/entries?quality=invalid",
          "GET",
          undefined,
          undefined,
          true,
        )
      ).status,
      422,
    );
    const list = await request(
      "/api/admin/reports",
      "GET",
      undefined,
      undefined,
      true,
    );
    assert.equal(list.status, 200);
    const pending = (
      list.data.reports as { id: string; revision: number; note: string }[]
    ).find((v) => v.note === prefix)!;
    assert.ok(pending);
    assert.equal(
      (
        await request(
          "/api/admin/reports/" + pending.id,
          "PATCH",
          { revision: pending.revision, resolved: true },
          undefined,
          true,
        )
      ).status,
      200,
    );
    console.log(
      "PASS: isolated repository checks plus real managed auth, private report APIs, admin quality filters, multiplayer Taboo secrecy, stale-action rejection, server timeout and report resolution.",
    );
  }
} finally {
  if (admin) await sql`DELETE FROM app_admins WHERE user_id=${admin}`;
  await sql`DELETE FROM round_reports WHERE note=${prefix}`;
  for (const code of rooms)
    await sql`DELETE FROM game_rooms WHERE code=${code}`;
  for (const id of ids) await sql`DELETE FROM content_entries WHERE id=${id}`;
}
