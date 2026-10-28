import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { isolatedDatabaseTarget } from "../lib/qa-target.ts";

// Never load .env.local, resolve a default project, or reset an existing database.
const url = isolatedDatabaseTarget(process.env);
process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED = url.href;
const sql = neon(url.href);
function run(script: string) {
  // The validated connection is sufficient; repository runners must not resolve
  // their historical project ID through a locally authenticated Neon CLI.
  const env = {
    ...process.env,
    ...(['scripts/test-qa-auth.mts','scripts/test-editorial-integration.mts'].includes(script) ? {} : { TEST_NEON_BRANCH: "" }),
  };
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`QA step failed: ${script}`);
}
if (process.argv.includes("--migrate-empty")) {
  if(process.argv.includes('--auth')){
    const users=await sql`SELECT count(*)::int AS n FROM neon_auth."user"`;
    if(users[0].n!==0)throw new Error('The disposable QA template must not contain existing auth users.');
  }
  const tables =
    await sql`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`;
  if (tables[0].n !== 0)
    throw new Error(
      "Initialization requires an empty QA public schema. No existing data will be reset.",
    );
  run("scripts/migrate.ts");
}
run("scripts/test-learning-integration.mts");
run("scripts/test-notebooks-integration.mts");
run("scripts/test-game-redesign.mts");
run('scripts/test-editorial-integration.mts');
if (process.argv.includes("--auth")) run("scripts/test-qa-auth.mts");
else
  console.log(
    "NOT RUN: managed Auth and real email delivery; use --auth with an isolated Auth endpoint.",
  );
