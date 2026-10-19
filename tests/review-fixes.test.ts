import test from "node:test";
import assert from "node:assert/strict";
import { prepareBulkEntry } from "../lib/bulk-entry";
import { entryInput, type Entry } from "../lib/content";
import { prepareMeaningEntries } from "../lib/meaning-quiz";
import { createGame, act, joinGame, viewGame } from "../lib/game";
import { prepareAttributionEntries } from "../lib/attribution";
import { resumeRoom } from "../lib/room-session";
import { roomPollDelay } from "../lib/room-polling";
import { guardReadRequest, readLimitBindings } from "../lib/read-guard";
import { publicReadCacheKey } from "../lib/public-read-cache";
const entry: Entry = {
  ...entryInput.parse({
    kind: "idiom",
    phrase: "Da geht mir ein Licht auf.",
    language: "de",
    challenge: {
      type: "meaning",
      correctIndex: 1,
      choices: [
        { de: "Ich mache Licht.", en: "I turn on a light." },
        { de: "Ich verstehe es.", en: "I understand." },
        { de: "Ich gehe weg.", en: "I leave." },
        { de: "Ich repariere es.", en: "I repair it." },
      ],
    },
  }),
  id: crypto.randomUUID(),
  status: "community",
  authorName: "QA",
  createdAt: new Date().toISOString(),
  revision: 0,
};
const player = () => ({
  id: crypto.randomUUID(),
  name: "QA",
  score: 0,
  tokenHash: crypto.randomUUID(),
});
test("bulk kind changes preserve compatible meaning tasks and reject destructive or incomplete conversions", () => {
  const patch = {
    entries: [{ id: entry.id, revision: 0 }],
    kind: "dialect" as const,
    regionId: "at",
  };
  const changed = prepareBulkEntry(entry, patch);
  assert.deepEqual(changed.challenge, entry.challenge);
  assert.equal(changed.kind, "dialect");
  for (const locale of ["de", "en"] as const)
    assert.equal(
      prepareMeaningEntries([{ ...entry, ...changed }], locale).length,
      1,
    );
  assert.throws(
    () => prepareBulkEntry(entry, { ...patch, kind: "tongue_twister" }),
    /inkompatible/,
  );
  assert.throws(
    () => prepareBulkEntry(entry, { ...patch, regionId: undefined }),
    /inkompatible/,
  );
  assert.deepEqual(
    entry.challenge?.type === "meaning" ? entry.challenge.correctIndex : null,
    1,
  );
});
test("authored and automatic song answers have consistent title-only labels with hidden solutions", () => {
  const song = (answer: string, artist: string): Entry => ({
    ...entry,
    id: crypto.randomUUID(),
    kind: "attribution",
    phrase: "Ein kurzer Liedtext",
    challenge: {
      type: "attribution",
      category: "song",
      answer,
      artist,
      aliases: [],
      alternatives: [],
    },
  });
  const pool = prepareAttributionEntries([
    song("Song A", "Artist A"),
    song("Song B", "Artist B"),
    song("Song C", "Artist C"),
    song("Song D", "Artist D"),
  ]);
  const host = player(),
    game = createGame("ABC234", host, "de", "who-said-it");
  act(game, host.id, { action: "configure", rounds: 1 });
  act(game, host.id, { action: "start" }, pool);
  const view = viewGame(game, host.id);
  assert.equal(view.options.length, 4);
  assert.ok(
    view.options.every(
      (option) => !option.text.includes("Artist") && !("correct" in option),
    ),
  );
  assert.equal(view.revelation, null);
  const authored = {
    ...song("Song A", "Artist A"),
    challenge: {
      type: "attribution" as const,
      category: "song" as const,
      answer: "Song A",
      artist: "Artist A",
      aliases: [],
      alternatives: ["Song B — Artist B", "Song C", "Song D"],
    },
  };
  const other = createGame("ABC235", player(), "de", "who-said-it");
  act(other, other.hostId, { action: "configure", rounds: 1 });
  act(
    other,
    other.hostId,
    { action: "start" },
    prepareAttributionEntries([authored]),
  );
  assert.ok(
    viewGame(other, other.hostId).options.every(
      (option) => !option.text.includes("Artist"),
    ),
  );
});
test("restoring room membership only falls back on invalid credentials, never on service failures", async () => {
  const calls: RequestInit[] = [];
  const fetcher = (status: number) =>
    (async (_url, init) => {
      calls.push(init!);
      return Response.json({ error: "Temporary failure" }, { status });
    }) as typeof fetch;
  assert.equal(await resumeRoom("ABC234", "saved", fetcher(200)), true);
  assert.equal(
    calls[0].headers && new Headers(calls[0].headers).get("Authorization"),
    "Bearer saved",
  );
  assert.equal(calls[0].method, undefined);
  for (const status of [401, 403])
    assert.equal(await resumeRoom("ABC234", "saved", fetcher(status)), false);
  await assert.rejects(
    () => resumeRoom("ABC234", "saved", fetcher(503)),
    /Temporary failure/,
  );
  assert.equal(await resumeRoom("ABC234", null, fetcher(200)), false);
  assert.equal(calls.length, 4);
});
test("polling slows down for submitted answers, lobbies and final scores while keeping active turns responsive", () => {
  const host = player(),
    other = { ...player(), name: "Other" },
    game = createGame("ABC236", host, "de", "meaning-quiz");
  joinGame(game, other);
  act(game, host.id, { action: "configure", rounds: 1 });
  act(game, host.id, { action: "start" }, [entry]);
  const active = roomPollDelay(viewGame(game, host.id));
  act(game, host.id, { action: "vote", optionId: game.round!.options[0].id });
  assert.ok(roomPollDelay(viewGame(game, host.id)) > active);
  act(game, other.id, { action: "vote", optionId: game.round!.options[0].id });
  act(game, host.id, { action: "next" });
  assert.equal(roomPollDelay(viewGame(game, host.id)), 8000);
});
test("read limits apply before queries, separate players behind one IP and never put credentials or raw IPs in keys", async () => {
  const seen: string[] = [];
  const counts = new Map<string, number>();
  const limiter = (maximum: number) => ({
    limit: async ({ key }: { key: string }) => {
      seen.push(key);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= maximum };
    },
  });
  const env = {
    PUBLIC_READ_LIMITER: limiter(2),
    ROOM_IP_LIMITER: limiter(1200),
    ROOM_READ_LIMITER: limiter(90),
  };
  const publicRequest = new Request(
    "https://example.test/api/entries/duplicates?q=test",
    { headers: { "cf-connecting-ip": "192.0.2.5" } },
  );
  assert.equal(await guardReadRequest(publicRequest, env), null);
  assert.equal(await guardReadRequest(publicRequest, env), null);
  const denied = await guardReadRequest(publicRequest, env);
  assert.equal(denied?.status, 429);
  assert.equal(denied?.headers.get("Retry-After"), "60");
  for (let player = 0; player < 10; player++)
    for (let poll = 0; poll < 50; poll++)
      assert.equal(
        await guardReadRequest(
          new Request("https://example.test/api/rooms/ABC234", {
            headers: {
              Authorization: "Bearer credential-" + player,
              "cf-connecting-ip": "192.0.2.1",
            },
          }),
          env,
        ),
        null,
      );
  assert.ok(
    seen.every(
      (key) => !key.includes("credential") && !key.includes("192.0.2."),
    ),
  );
  assert.ok(readLimitBindings.every((binding) => binding.simple.period === 60));
  assert.equal(
    await guardReadRequest(
      new Request("https://example.test/api/entries", { method: "POST" }),
      env,
    ),
    null,
  );
});
test("shared caching is limited to public registries and strips identity headers", () => {
  for (const path of [
    "/api/rooms/ABC234",
    "/api/admin/users",
    "/api/me/entries",
    "/api/entries",
    "/api/audio/123",
    "/api/auth/get-session",
  ])
    assert.equal(
      publicReadCacheKey(new Request("https://example.test" + path)),
      null,
    );
  const key = publicReadCacheKey(
    new Request("https://example.test/api/regions?ignored=true", {
      headers: { Cookie: "secret", Authorization: "Bearer secret" },
    }),
  )!;
  assert.equal(key.url, "https://example.test/api/regions");
  assert.equal([...key.headers].length, 0);
});

test("encoded paths, trailing slashes and HEAD requests cannot bypass database read limits", async () => {
  const denied = { limit: async () => ({ success: false }) };
  const env = {
    PUBLIC_READ_LIMITER: denied,
    ROOM_IP_LIMITER: denied,
    ROOM_READ_LIMITER: denied,
  };
  for (const path of [
    "/api/%65ntries",
    "/api/entries/",
    "/api/admin/users",
    "/api/me/entries",
    "/api/rooms/%41BC234",
  ])
    for (const method of ["GET", "HEAD"])
      assert.equal(
        (
          await guardReadRequest(
            new Request("https://example.test" + path, { method }),
            env,
          )
        )?.status,
        429,
      );
  assert.equal(
    await guardReadRequest(
      new Request("https://example.test/api/auth/get-session"),
      env,
    ),
    null,
  );
});
