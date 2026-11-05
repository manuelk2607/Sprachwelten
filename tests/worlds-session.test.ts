import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { SESSION_COOKIE, token } from "@worlds-hub/auth";
import { hash } from "@worlds-hub/auth/store";
import { createWorldsConfig, mappedLearningUser, worldsRoute } from "../lib/auth/worlds";

const origin = "https://sprach-pilot.test";
const issuer = "https://issuer.test/auth";
const env = {
  WORLDS_PILOT_ENABLED: "true",
  WORLDS_PILOT_ORIGIN: origin,
  WORLDS_PILOT_DATABASE_HOST: "ep-qa.neon.tech",
  DATABASE_URL: "postgres://ep-qa.neon.tech/sprachspiel",
  NEON_AUTH_BASE_URL: "https://ep-qa.neonauth.eu.neon.tech/sprachspiel/auth",
  WORLDS_CLIENT_ID: "test-client",
  WORLDS_ISSUER: issuer,
  WORLDS_RESOURCE: origin + "/api",
};

test("Worlds login requires an isolated Sprachwelten database and its own managed Auth endpoint", () => {
  const query = async () => [];
  assert.equal(createWorldsConfig({}, query), undefined);
  assert.equal(createWorldsConfig({...env, WORLDS_PILOT_ORIGIN: "https://sprachwelten.maki26.workers.dev"}, query), undefined);
  assert.equal(createWorldsConfig({...env, DATABASE_URL: "postgres://wrong.neon.tech/sprachspiel"}, query), undefined);
  assert.equal(createWorldsConfig({...env, NEON_AUTH_BASE_URL: "https://ep-other.neonauth.eu.neon.tech/sprachspiel/auth"}, query), undefined);
  assert.equal(createWorldsConfig(env, query)?.origin, origin);
});

test("Worlds resolves only an explicitly mapped local learner and revokes access on local ban or logout", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA neon_auth;
      CREATE TABLE neon_auth."user" (id uuid PRIMARY KEY, name text NOT NULL, banned boolean, "banExpires" timestamptz);
      CREATE TABLE vocabulary_notebooks (id text PRIMARY KEY, owner_id text NOT NULL);
    `);
    const migration = await readFile(new URL("../db/migrations/027_worlds_identity.sql", import.meta.url), "utf8");
    await db.exec(migration);
    const query = async (text: string, values: unknown[]) => (await db.query<Record<string, unknown>>(text, values)).rows;
    const config = createWorldsConfig(env, query)!;
    const id = crypto.randomUUID(), subject = token(), csrf = token(), raw = token(), sessionKey = await hash(raw);
    await query('INSERT INTO neon_auth."user" (id,name) VALUES ($1,$2)', [id, "Existing learner"]);
    await query("INSERT INTO vocabulary_notebooks VALUES ('old-private-notebook',$1)", [id]);
    await config.store.putSession(sessionKey, {issuer, sub:subject, expires:Date.now()+60_000, csrf, email:"example@example.test"});
    const cookie = SESSION_COOKIE + "=" + raw;
    const request = new Request(origin + "/auth/status", {headers: {cookie}});
    assert.deepEqual(await (await worldsRoute(request, config, query)).json(), {user:null});
    await query("INSERT INTO worlds_identity_links (issuer,subject,local_user_id) VALUES ($1,$2,$3)", ["https://wrong-issuer.test", subject, id]);
    assert.equal(await mappedLearningUser(request, config, query), undefined);
    await query("UPDATE worlds_identity_links SET issuer=$1 WHERE local_user_id=$2", [issuer, id]);
    const learner = await mappedLearningUser(request, config, query);
    assert.deepEqual(learner, {id, name:"Existing learner"});
    const otherLogin = new Request(origin + "/auth/status", {headers: {cookie: cookie + "; __Secure-neon-auth.session_token=fixture"}});
    assert.deepEqual(await (await worldsRoute(otherLogin, config, query)).json(), {user:null});
    assert.deepEqual(await query("SELECT id FROM vocabulary_notebooks WHERE owner_id=$1", [learner!.id]), [{id:"old-private-notebook"}]);
    assert.equal(await mappedLearningUser(new Request("https://other-pilot.test/auth/status", {headers: {cookie}}), config, query), undefined);
    await query('UPDATE neon_auth."user" SET banned=true WHERE id=$1', [id]);
    assert.equal(await mappedLearningUser(request, config, query), undefined);
    await query('UPDATE neon_auth."user" SET "banExpires"=now()-interval \'1 minute\' WHERE id=$1', [id]);
    assert.equal((await mappedLearningUser(request, config, query))?.id, id);

    const logout = (csrf: string) => worldsRoute(new Request(origin+"/auth/logout?locale=en", {method:"POST", headers: {cookie, origin},
      body: new URLSearchParams({csrf})}), config, query);
    assert.equal((await logout(token())).status, 403);
    assert.equal((await mappedLearningUser(request, config, query))?.id, id);
    assert.equal((await logout(csrf)).headers.get("location"), "/en/learn");
    assert.equal(await mappedLearningUser(request, config, query), undefined);
  } finally { await db.close(); }
});
