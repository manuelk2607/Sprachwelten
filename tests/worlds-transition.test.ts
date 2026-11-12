import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { token, SESSION_COOKIE } from "@worlds-hub/auth";
import { hash } from "@worlds-hub/auth/store";
import { PostgresLinkStore } from "@worlds-hub/auth/postgres-links";
import {
  prepareManagedSessionLink,
  confirmManagedSessionLink,
} from "@worlds-hub/auth/linking";
import { loadManagedOwner } from "../lib/auth/managed-owner";
import {
  managedTransitionIdentity,
  transitionUser,
} from "../lib/auth/managed-transition";
import { nativeTransitionRoute } from "../lib/auth/native-transition-route";
import { createWorldsConfig } from "../lib/auth/worlds";
import { resolveProjectIdentity } from "../lib/auth/project-identity";
import { maintainWorldsTransitions } from "../db/transition-maintenance";
import {
  sessionEventContentType,
  sessionRevocationPath,
  signSessionRevocation,
} from "@worlds-hub/auth/session-revocation";
import { receiveWorldsSessionEvent } from "../lib/auth/session-events";
import { createWorldsProjectAccount } from "../lib/auth/project-accounts";
import { reportWorldsMigrations } from "../lib/auth/worlds-migration-receipts";

const origin = "https://sprach-pilot.test",
  issuer = "https://central.test/auth";
const settings = {
  origin,
  issuer: "https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth",
  cookieSecret: "synthetic-configuration-only-at-least-32-characters",
};
async function fixture(apply = true, sessionEventJwk?: string) {
  const db = new PGlite(),
    id = crypto.randomUUID(),
    other = crypto.randomUUID(),
    now = Date.now(),
    sub = token(),
    raw = token(),
    csrf = token();
  await db.exec(
    'CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text,banned boolean,"banExpires" timestamptz);CREATE TABLE neon_auth.session(id text PRIMARY KEY,"userId" uuid,"createdAt" timestamptz,"expiresAt" timestamptz);CREATE TABLE app_admins(user_id uuid PRIMARY KEY);',
  );
  const query = async (sql: string, params: unknown[]) =>
    (await db.query<Record<string, unknown>>(sql, params)).rows;
  for (const user of [id, other])
    await query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)', [
      user,
      "Historical owner",
    ]);
  for (const file of [
    "027_worlds_identity.sql",
    "028_worlds_project_accounts.sql",
    ...(apply ? ["029_worlds_legacy_sessions.sql"] : []),
    ...(sessionEventJwk
      ? ["030_worlds_session_revocations.sql", "031_worlds_native_revocation_precision.sql"]
      : []),
  ])
    await db.exec(
      await readFile(
        new URL("../db/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  for (const [sid, owner, expiry] of [
    ["first", id, now + 3_600_000],
    ["second", id, now + 7_200_000],
    ["expired", id, now - 1],
    ["foreign", other, now + 7_200_000],
  ] as const)
    await query("INSERT INTO neon_auth.session VALUES($1,$2,$3,$4)", [
      sid,
      owner,
      new Date(now - 86_400_000).toISOString(),
      new Date(expiry).toISOString(),
    ]);
  const config = createWorldsConfig(
    {
      WORLDS_PILOT_ENABLED: "true",
      WORLDS_PILOT_ORIGIN: origin,
      WORLDS_PILOT_DATABASE_HOST: "ep-qa.neon.tech",
      DATABASE_URL: "postgres://fixture:fixture@ep-qa.neon.tech/sprachspiel",
      NEON_AUTH_BASE_URL: settings.issuer,
      WORLDS_CLIENT_ID: "fixture",
      WORLDS_ISSUER: issuer,
      WORLDS_RESOURCE: origin + "/api",
      WORLDS_HUB_SESSION_EVENT_JWK: sessionEventJwk,
    },
    query,
  )!;
  await config.store.putSession(await hash(raw), {
    issuer,
    sub,
    csrf,
    name: "Central owner",
    email: "synthetic@fixture.invalid",
    authenticatedAt: now,
    expires: now + 120_000,
  });
  const request = (
    path = "/api/private",
    cookie = SESSION_COOKIE +
      "=" +
      raw +
      "; __Secure-neon-auth.session_token=native-only",
    method = "GET",
    requestOrigin = origin,
  ) =>
    new Request(requestOrigin + path, {
      method,
      headers: { origin: requestOrigin, cookie },
      ...(method === "POST" ? { body: "{}" } : {}),
    });
  const snapshot = () =>
    query("SELECT * FROM neon_auth.session ORDER BY id", []);
  const dto = (sid = "first") => ({
    id,
    name: "Historical owner",
    sessionId: sid,
    createdAt: now - 86_400_000,
    expiresAt: now + 3_600_000,
    validatedAt: now,
  });
  const response = (sid = "first") => ({
    user: {
      id,
      name: "Historical owner",
      email: "synthetic@fixture.invalid",
      emailVerified: false,
    },
    session: {
      id: sid,
      userId: id,
      createdAt: new Date(now - 86_400_000).toISOString(),
      expiresAt: new Date(now + 3_600_000).toISOString(),
    },
  });
  return {
    db,
    id,
    other,
    query,
    now,
    sub,
    raw,
    config,
    request,
    snapshot,
    dto,
    response,
  };
}

test("confirmed legacy migrations report from the audit, retry safely and report rollback with the same reference", async (t) => {
  const f = await fixture();
  try {
    const audit = (subject: string, account: string) => f.query(
      "INSERT INTO worlds_link_audit(issuer,subject,local_user_id,event) VALUES($1,$2,$3,'linked')",
      [issuer, subject, account],
    );
    const linked = "existing-legacy-link";
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, linked, f.other],
    );
    await audit(linked, f.other);
    await audit("removed-before-migration", f.id);
    await createWorldsProjectAccount({ issuer, sub: "new-profile-before", name: "New profile" }, f.query);
    await f.db.exec(await readFile(new URL("../db/migrations/032_worlds_migration_receipts.sql", import.meta.url), "utf8"));
    assert.deepEqual(
      await f.query("SELECT subject FROM worlds_link_audit WHERE receipt_eligible", []),
      [{ subject: linked }],
    );

    const { privateKey } = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
    const env = {
      WORLDS_RECEIPT_URL: "https://hub-qa.invalid/api/migrations/receipts/sprachwelten",
      WORLDS_RECEIPT_KID: "fixture",
      WORLDS_RECEIPT_KEY: JSON.stringify(await crypto.subtle.exportKey("jwk", privateKey)),
    };
    const sent: { sub: string; account_ref: string; revision: number; state: string }[] = [];
    let refuseOnce = true;
    t.mock.method(globalThis, "fetch", async (input: string | Request | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin === new URL(settings.issuer).origin) return Response.json(f.response());
      assert.equal(url.href, env.WORLDS_RECEIPT_URL);
      const payload = JSON.parse(Buffer.from(String(init?.body).split(".")[1], "base64url").toString()) as typeof sent[number];
      sent.push(payload);
      if (payload.sub === linked) return Response.json({ error: "RECEIPT_CONFLICT" }, { status: 409 });
      if (refuseOnce) {
        refuseOnce = false;
        return Response.json({ error: "TEMPORARY" }, { status: 503 });
      }
      return Response.json({ result: "stored" });
    });

    const owner = await loadManagedOwner(f.request("/auth/worlds/link", undefined, "POST"), settings, f.query);
    const central = { issuer, subject: f.sub, sessionId: "central-fixture", authenticatedAt: f.now };
    const store = new PostgresLinkStore(f.query);
    const proof = await prepareManagedSessionLink(central, owner.proof, store);
    await confirmManagedSessionLink(proof, central, owner.proof, store);
    await createWorldsProjectAccount({ issuer, sub: "new-profile-after", name: "New profile" }, f.query);
    await f.query("DELETE FROM worlds_identity_links WHERE issuer=$1 AND subject=$2", [issuer, "new-profile-after"]);

    await assert.rejects(reportWorldsMigrations(f.query, issuer, {
      ...env,
      WORLDS_RECEIPT_URL: "https://worlds-hub.maki26.workers.dev/api/migrations/receipts/sprachwelten",
    }), /isolated Hub/);
    assert.equal(sent.length, 0);
    await assert.rejects(reportWorldsMigrations(f.query, issuer, env), /refused delivery/);
    assert.deepEqual(
      await f.query("SELECT subject FROM worlds_link_audit WHERE receipt_conflict_at IS NOT NULL", []),
      [{ subject: linked }],
    );
    assert.deepEqual(await reportWorldsMigrations(f.query, issuer, env), { acknowledged: 1, conflict: 0 });
    assert.deepEqual(sent.map(receipt => receipt.sub), [linked, f.sub, f.sub]);
    assert.equal(sent[1].revision, sent[2].revision);
    assert.equal(sent[2].state, "confirmed");
    assert.match(sent[2].account_ref, /^[a-f0-9]{64}$/);

    const before = await f.snapshot();
    const remove = () => f.query(
      "DELETE FROM worlds_identity_links WHERE issuer=$1 AND subject=$2 AND local_user_id=$3",
      [issuer, f.sub, f.id],
    );
    await f.db.exec("BEGIN");
    await remove();
    await f.db.exec("ROLLBACK");
    const key = await hash(f.raw);
    assert.ok(await f.config.store.getSession(key));
    assert.deepEqual(await reportWorldsMigrations(f.query, issuer, env), { acknowledged: 0, conflict: 0 });

    await remove();
    assert.equal(await f.config.store.getSession(key), null);
    assert.deepEqual(await reportWorldsMigrations(f.query, issuer, env), { acknowledged: 1, conflict: 0 });
    assert.equal(sent[3].state, "revoked");
    assert.ok(sent[3].revision > sent[2].revision);
    assert.equal(sent[3].account_ref, sent[2].account_ref);
    assert.deepEqual(await f.snapshot(), before);
    assert.deepEqual(
      await f.query("SELECT id FROM worlds_project_accounts WHERE id=$1", [f.id]),
      [{ id: f.id }],
    );
  } finally {
    await f.db.close();
  }
});

test("a signed Hub event ends existing Worlds and retained native sessions while preserving later logins and other accounts", async () => {
  const keys = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);
  const { kty, crv, x } = await crypto.subtle.exportKey("jwk", keys.publicKey);
  const kid = "worlds-hub-event-fixture";
  const jwk = JSON.stringify({ kid, kty, crv, x });
  const f = await fixture(true, jwk);
  try {
    const revokedThrough = Math.floor(f.now / 1000) * 1000;
    const sameSecondNative = { ...f.dto(), createdAt: revokedThrough + 999 };
    const recentNative = new Date(revokedThrough + 1000);
    await f.query('UPDATE neon_auth.session SET "createdAt"=$1 WHERE id=$2', [
      new Date(sameSecondNative.createdAt).toISOString(),
      "first",
    ]);
    await f.query('UPDATE neon_auth.session SET "createdAt"=$1 WHERE id=$2', [
      recentNative.toISOString(),
      "second",
    ]);
    const before = await f.snapshot();
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    const store = f.config.store;
    const value = {
      issuer,
      sub: f.sub,
      csrf: token(),
      expires: f.now + 60_000,
    };
    await store.putSession("existing-bff", {
      ...value,
      authenticatedAt: revokedThrough,
    });
    await store.putSession("newer-bff", {
      ...value,
      authenticatedAt: revokedThrough + 1000,
    });
    await store.putSession("control-bff", {
      ...value,
      sub: "control",
      authenticatedAt: revokedThrough,
    });
    assert.ok(await transitionUser(sameSecondNative, f.query, issuer));

    const audience = origin + sessionRevocationPath;
    const signed = await signSessionRevocation(
      {
        eventId: "sprachwelten-worlds-fixture",
        identityIssuer: issuer,
        subject: f.sub,
        revokedThrough,
      },
      "https://worlds-hub.maki26.workers.dev",
      audience,
      { kid, privateKey: keys.privateKey },
    );
    const request = () =>
      new Request(audience, {
        method: "POST",
        headers: { "content-type": sessionEventContentType },
        body: signed,
      });
    assert.equal(
      (await receiveWorldsSessionEvent(request(), f.config, {})).status,
      404,
    );
    const env = { WORLDS_HUB_SESSION_EVENT_JWK: jwk };
    for (const attempt of [1, 2]) {
      assert.equal(
        (await receiveWorldsSessionEvent(request(), f.config, env)).status,
        202,
        `delivery ${attempt}`,
      );
    }
    assert.equal(await store.getSession("existing-bff"), null);
    assert.equal(await transitionUser(sameSecondNative, f.query), null);
    // Even a grant inserted concurrently with the event is fenced on read.
    await f.query(
      "INSERT INTO worlds_legacy_sessions VALUES($1,$2,now()+interval '1 hour')",
      [f.id, await hash("first")],
    );
    assert.equal(await transitionUser(sameSecondNative, f.query, issuer), null);
    assert.ok(await store.getSession("newer-bff"));
    assert.ok(await store.getSession("control-bff"));
    assert.ok(
      await transitionUser(
        { ...f.dto("second"), createdAt: recentNative.getTime() },
        f.query,
        issuer,
      ),
    );
    assert.deepEqual(await f.snapshot(), before);
    assert.equal(
      (await f.query("SELECT local_user_id FROM worlds_identity_links", []))[0]
        ?.local_user_id,
      f.id,
    );
  } finally {
    await f.db.close();
  }
});

test("first verified link atomically snapshots all existing devices, preserves fixed expiry and never enrolls later logins or relinks", async (t) => {
  const f = await fixture();
  try {
    t.mock.method(
      globalThis,
      "fetch",
      async (input: string | URL | Request) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        assert.equal(url.searchParams.get("disableCookieCache"), "true");
        assert.equal(url.searchParams.get("disableRefresh"), "true");
        return Response.json(f.response());
      },
    );
    const before = await f.snapshot(),
      owner = await loadManagedOwner(
        f.request("/auth/worlds/link", undefined, "POST"),
        settings,
        f.query,
      );
    const central = {
        issuer,
        subject: f.sub,
        sessionId: "central-fixture",
        authenticatedAt: f.now,
      },
      store = new PostgresLinkStore(f.query),
      proof = await prepareManagedSessionLink(central, owner.proof, store);
    // Failure after the INSERT trigger must roll back both the marker and grants.
    await f.db.exec(
      "ALTER TABLE worlds_link_audit ADD CONSTRAINT fixture_failure CHECK(false)",
    );
    await assert.rejects(
      confirmManagedSessionLink(proof, central, owner.proof, store),
    );
    assert.deepEqual(
      await f.query(
        "SELECT legacy_cutover_at FROM worlds_project_accounts WHERE id=$1",
        [f.id],
      ),
      [{ legacy_cutover_at: null }],
    );
    assert.equal(
      (
        await f.query(
          "SELECT count(*)::int AS n FROM worlds_legacy_sessions",
          [],
        )
      )[0].n,
      0,
    );
    await f.db.exec(
      "ALTER TABLE worlds_link_audit DROP CONSTRAINT fixture_failure",
    );
    await confirmManagedSessionLink(proof, central, owner.proof, store);
    const grants = await f.query(
      "SELECT session_hash,expires_at FROM worlds_legacy_sessions WHERE local_user_id=$1 ORDER BY session_hash",
      [f.id],
    );
    assert.equal(grants.length, 2);
    assert.deepEqual(
      new Set(grants.map((row) => row.session_hash)),
      new Set([await hash("first"), await hash("second")]),
    );
    assert.equal((await transitionUser(f.dto(), f.query))?.id, f.id);
    assert.equal((await transitionUser(f.dto("second"), f.query))?.id, f.id);
    assert.deepEqual(await f.snapshot(), before);
    await f.query(
      "INSERT INTO neon_auth.session VALUES($1,$2,now(),now()+interval '1 day')",
      ["later", f.id],
    );
    assert.equal(await transitionUser(f.dto("later"), f.query), null);
    await f.query(
      "UPDATE worlds_legacy_sessions SET expires_at=now()-interval '1 second' WHERE session_hash=$1",
      [await hash("first")],
    );
    assert.equal(
      await transitionUser(
        { ...f.dto(), expiresAt: f.now + 86_400_000 },
        f.query,
      ),
      null,
    );
    assert.equal((await transitionUser(f.dto("second"), f.query))?.id, f.id);
    // Unlink/relink cannot reset the cutover marker or create fresh grants.
    const marker = await f.query(
      "SELECT legacy_cutover_at FROM worlds_project_accounts WHERE id=$1",
      [f.id],
    );
    await f.query("DELETE FROM worlds_identity_links WHERE local_user_id=$1", [
      f.id,
    ]);
    assert.equal(await transitionUser(f.dto("second"), f.query), null);
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    assert.deepEqual(
      await f.query(
        "SELECT legacy_cutover_at FROM worlds_project_accounts WHERE id=$1",
        [f.id],
      ),
      marker,
    );
    assert.equal(
      (
        await f.query(
          "SELECT count(*)::int AS n FROM worlds_legacy_sessions WHERE local_user_id=$1",
          [f.id],
        )
      )[0].n,
      0,
    );
  } finally {
    await f.db.close();
  }
});

test("provider observation and retained grants jointly control identity; new or revoked sessions fall back to Worlds, outages and bans fail closed", async (t) => {
  const f = await fixture();
  let status = 200,
    sid = "first",
    active = true,
    reads = 0;
  try {
    t.mock.method(globalThis, "fetch", async () => {
      reads++;
      return Response.json(
        status === 200
          ? active
            ? f.response(sid)
            : null
          : { message: "PRIVATE_PROVIDER_DETAIL" },
        { status },
      );
    });
    const read = () =>
      managedTransitionIdentity(f.request(), settings, f.query);
    assert.equal((await read()).user?.id, f.id);
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    assert.equal((await read()).user?.id, f.id);
    sid = "new-unretained";
    const fresh = await resolveProjectIdentity(
      f.request(),
      f.config,
      f.query,
      read,
    );
    assert.equal(fresh.source, "worlds");
    assert.equal(fresh.user?.id, f.id);
    active = false;
    assert.equal(
      (await resolveProjectIdentity(f.request(), f.config, f.query, read))
        .source,
      "worlds",
    );
    status = 503;
    const unavailable = await resolveProjectIdentity(
      f.request(),
      f.config,
      f.query,
      read,
    );
    assert.ok(unavailable.error);
    assert.equal(unavailable.user, null);
    const previous = reads;
    const ambiguous = await managedTransitionIdentity(
      f.request(
        undefined,
        "__Secure-neon-auth.session_token=one; __Secure-neon-auth.session_token=two",
      ),
      settings,
      f.query,
    );
    assert.ok(ambiguous.error);
    assert.equal(reads, previous);
    status = 200;
    active = true;
    sid = "first";
    await f.query('UPDATE neon_auth."user" SET banned=true WHERE id=$1', [
      f.id,
    ]);
    assert.ok((await read()).error);
  } finally {
    await f.db.close();
  }
});

test("existing links receive no invented session grants during migration", async () => {
  const f = await fixture(false);
  try {
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    await f.db.exec(
      await readFile(
        new URL(
          "../db/migrations/029_worlds_legacy_sessions.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.equal(await transitionUser(f.dto(), f.query), null);
    assert.deepEqual(
      await f.query(
        "SELECT legacy_cutover_at=linked_at AS original FROM worlds_project_accounts a JOIN worlds_identity_links l ON l.local_user_id=a.id WHERE a.id=$1",
        [f.id],
      ),
      [{ original: true }],
    );
  } finally {
    await f.db.close();
  }
});

test("scheduled cleanup is bounded, preserves active devices and the retirement marker, and supports the previous schema", async () => {
  const f = await fixture(),
    old = await fixture(false);
  try {
    assert.equal(await maintainWorldsTransitions(old.query), 0);
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    const original = await f.snapshot(),
      marker = await f.query(
        "SELECT legacy_cutover_at FROM worlds_project_accounts WHERE id=$1",
        [f.id],
      );
    await f.query(
      "INSERT INTO worlds_legacy_sessions SELECT $1,encode(sha256(convert_to('expired-fixture-'||i::text,'UTF8')),'hex'),now()-interval '1 day' FROM generate_series(1,501) AS i",
      [f.id],
    );
    assert.equal(await maintainWorldsTransitions(f.query), 500);
    assert.equal(await maintainWorldsTransitions(f.query), 1);
    assert.equal(await maintainWorldsTransitions(f.query), 0);
    assert.equal(
      (
        await f.query(
          "SELECT count(*)::int AS n FROM worlds_legacy_sessions",
          [],
        )
      )[0].n,
      2,
    );
    assert.deepEqual(
      await f.query(
        "SELECT legacy_cutover_at FROM worlds_project_accounts WHERE id=$1",
        [f.id],
      ),
      marker,
    );
    assert.deepEqual(await f.snapshot(), original);
  } finally {
    await f.db.close();
    await old.db.close();
  }
});

test("verified issuer/subject or session revocation atomically ends the retained native fallback without removing mappings or another account", async () => {
  for (const bySession of [false, true]) {
    const f = await fixture();
    try {
      await f.query(
        "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3),($1,$4,$5)",
        [issuer, f.sub, f.id, "control-root", f.other],
      );
      const current = await f.config.store.getSession(await hash(f.raw));
      assert.ok(current);
      await f.config.store.deleteSession(await hash(f.raw));
      await f.config.store.putSession(await hash(f.raw), {
        ...current,
        sid: "current-central-session",
      });
      const control = token();
      await f.config.store.putSession(await hash(control), {
        ...current,
        sub: "control-root",
        sid: "control-central-session",
      });
      await f.config.store.revokeIdentity(
        "https://other-issuer.invalid",
        f.sub,
      );
      assert.ok(await f.config.store.getSession(await hash(f.raw)));
      assert.equal((await transitionUser(f.dto(), f.query))?.id, f.id);
      await f.config.store.revokeIdentity(
        issuer,
        bySession ? undefined : f.sub,
        bySession ? "current-central-session" : undefined,
      );
      assert.equal(await f.config.store.getSession(await hash(f.raw)), null);
      assert.equal(await transitionUser(f.dto(), f.query), null);
      assert.ok(await f.config.store.getSession(await hash(control)));
      assert.equal(
        (
          await f.query(
            "SELECT count(*)::int AS n FROM worlds_legacy_sessions WHERE local_user_id=$1",
            [f.other],
          )
        )[0].n,
        1,
      );
      assert.equal(
        (
          await f.query(
            "SELECT count(*)::int AS n FROM worlds_identity_links",
            [],
          )
        )[0].n,
        2,
      );
      await f.config.store.revokeIdentity(issuer, f.sub);
      assert.equal(
        (
          await f.query(
            "SELECT count(*)::int AS n FROM worlds_legacy_sessions WHERE local_user_id=$1",
            [f.id],
          )
        )[0].n,
        0,
      );
    } finally {
      await f.db.close();
    }
  }
});

test("native SDK endpoints permit only an unmapped central owner proof and own sign-out; session reads cannot refresh or trust cache", async () => {
  const f = await fixture();
  let forwarded: Request | undefined,
    calls = 0;
  const forward = async (request: Request) => {
    calls++;
    forwarded = request;
    return Response.json(
      { user: { id: f.id }, success: true },
      {
        headers: {
          "set-cookie":
            "__Secure-neon-auth.session_token=fresh-only; Path=/; HttpOnly; Secure",
        },
      },
    );
  };
  const route = (path: string, cookie?: string, method = "POST") =>
    nativeTransitionRoute(
      f.request("/api/auth/" + path, cookie, method),
      path,
      f.config,
      f.query,
      forward,
    );
  try {
    for (const path of [
      "sign-up/email",
      "update-user",
      "change-password",
      "admin/list-users",
    ])
      assert.equal((await route(path)).status, 403);
    assert.equal((await route("sign-in/email", "")).status, 403);
    assert.equal(calls, 0);
    assert.equal((await route("sign-in/email")).status, 200);
    assert.equal(calls, 1);
    assert.equal((await route("request-password-reset")).status, 200);
    const headers = new Headers(f.request().headers);
    headers.set("authorization", "Bearer FOREIGN");
    headers.set(
      "cookie",
      "__Secure-neon-auth.session_token=own; __Secure-neon-auth.local.session_data=stale; __Host-worlds-session=other",
    );
    const got = await nativeTransitionRoute(
      new Request(origin + "/api/auth/get-session?disableRefresh=false", {
        headers,
      }),
      "get-session",
      f.config,
      f.query,
      forward,
    );
    assert.equal(got.status, 200);
    assert.equal(
      new URL(forwarded!.url).searchParams.get("disableRefresh"),
      "true",
    );
    assert.equal(
      new URL(forwarded!.url).searchParams.get("disableCookieCache"),
      "true",
    );
    assert.equal(
      forwarded!.headers.get("cookie"),
      "__Secure-neon-auth.session_token=own",
    );
    assert.equal(forwarded!.headers.has("authorization"), false);
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, f.sub, f.id],
    );
    const count = calls;
    for (const path of [
      "sign-in/email",
      "request-password-reset",
      "reset-password",
    ])
      assert.equal((await route(path)).status, 403);
    assert.equal(calls, count);
    assert.equal((await route("sign-out")).status, 200);
    const foreign = new Request(origin + "/api/auth/sign-out", {
      method: "POST",
      headers: { origin: "https://foreign.test" },
    });
    assert.equal(
      (
        await nativeTransitionRoute(
          foreign,
          "sign-out",
          f.config,
          f.query,
          forward,
        )
      ).status,
      403,
    );
  } finally {
    await f.db.close();
  }
});

test("post-cutover native registrations cannot create project actors, and another unmapped central account cannot reopen a linked native target", async () => {
  const f = await fixture();
  try {
    const postCutover = crypto.randomUUID();
    await f.query('INSERT INTO neon_auth."user"(id,name) VALUES($1,$2)', [
      postCutover,
      "Post-cutover fixture",
    ]);
    assert.equal(
      await transitionUser({ ...f.dto(), id: postCutover }, f.query),
      null,
    );
    assert.equal(
      (
        await f.query(
          "SELECT count(*)::int AS n FROM worlds_project_accounts WHERE id=$1",
          [postCutover],
        )
      )[0].n,
      0,
    );
    await f.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES($1,$2,$3)",
      [issuer, "different-central-owner", f.id],
    );
    const paths: string[] = [];
    const response = await nativeTransitionRoute(
      f.request("/api/auth/sign-in/email", undefined, "POST"),
      "sign-in/email",
      f.config,
      f.query,
      async (request, override) => {
        paths.push(override ?? "sign-in/email");
        if (override) {
          assert.equal(override, "sign-out");
          assert.equal(
            request.headers.get("cookie"),
            "__Secure-neon-auth.session_token=newly-issued",
          );
          assert.equal(await request.text(), "{}");
          return Response.json({ success: true });
        }
        return Response.json(
          { user: { id: f.id }, token: "PRIVATE_NEW_SESSION" },
          {
            headers: {
              "set-cookie":
                "__Secure-neon-auth.session_token=newly-issued; Path=/; Secure; HttpOnly",
            },
          },
        );
      },
    );
    assert.equal(response.status, 403);
    assert.deepEqual(paths, ["sign-in/email", "sign-out"]);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.equal(
      (await response.text()).includes("PRIVATE_NEW_SESSION"),
      false,
    );
  } finally {
    await f.db.close();
  }
});
