import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { sqlStatements } from "../lib/sql-statements";

test("migration execution preserves procedural bodies and literal/comment semicolons in one atomic transaction", async () => {
  const db = new PGlite();
  try {
    const source = `-- ; not a command
   CREATE TABLE "semi;colon"(id int PRIMARY KEY,value text);
   /* outer ; /* nested ; */ comment */
   CREATE FUNCTION fixture_value() RETURNS text LANGUAGE plpgsql AS $fn$
   BEGIN RETURN 'it''s;intact'; END;
   $fn$;
   INSERT INTO "semi;colon" VALUES(1,fixture_value());
   INSERT INTO "semi;colon" VALUES(2,E'escaped\\\';value');`;
    const statements = sqlStatements(source);
    assert.equal(statements.length, 4);
    await db.exec("BEGIN");
    for (const statement of statements) await db.query(statement);
    await db.exec("COMMIT");
    assert.deepEqual(
      (await db.query('SELECT value FROM "semi;colon" ORDER BY id')).rows,
      [{ value: "it's;intact" }, { value: "escaped';value" }],
    );
  } finally {
    await db.close();
  }
});
test("the actual transition migration runs statement-by-statement and refuses incomplete delimiters before execution", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'CREATE SCHEMA neon_auth;CREATE TABLE neon_auth."user"(id uuid PRIMARY KEY,name text);CREATE TABLE neon_auth.session(id text,"userId" uuid,"expiresAt" timestamptz);',
    );
    const id = crypto.randomUUID();
    await db.query('INSERT INTO neon_auth."user" VALUES($1,$2)', [
      id,
      "Fixture",
    ]);
    for (const file of [
      "027_worlds_identity.sql",
      "028_worlds_project_accounts.sql",
      "029_worlds_legacy_sessions.sql",
    ]) {
      const statements = sqlStatements(
        await readFile(
          new URL("../db/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
      await db.exec("BEGIN");
      for (const statement of statements) await db.query(statement);
      await db.exec("COMMIT");
    }
    await db.query(
      "INSERT INTO neon_auth.session VALUES('existing',$1,now()+interval '1 hour')",
      [id],
    );
    await db.query(
      "INSERT INTO worlds_identity_links(issuer,subject,local_user_id) VALUES('https://fixture.invalid','fixture',$1)",
      [id],
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "SELECT count(*)::int AS n FROM worlds_legacy_sessions",
        )
      ).rows[0].n,
      1,
    );
    for (const invalid of [
      "SELECT 'unterminated",
      'SELECT "unterminated',
      "DO $body$ BEGIN; END;",
      "/* missing end",
    ])
      assert.throws(() => sqlStatements(invalid));
  } finally {
    await db.close();
  }
});
