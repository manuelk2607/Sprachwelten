import { neon } from "@neondatabase/serverless";
import { reportProductionWorldsMigrations, reportWorldsMigrations } from "../lib/auth/worlds-migration-receipts.ts";
import { isolatedAuthTarget, isolatedDatabaseTarget } from "../lib/qa-target.ts";
import { worldsPilotIssuer } from "../lib/worlds-pilot.ts";
import { isWorldsProductionTarget } from "../lib/worlds-production.ts";

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--production")) {
    throw new Error("Unexpected argument.");
  }
  let result;
  if (args[0] === "--production") {
    if (!isWorldsProductionTarget(process.env) || !process.env.WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK) {
      throw new Error("The exact production target and its signing key are required.");
    }
    const sql = neon(process.env.DATABASE_URL!);
    result = await reportProductionWorldsMigrations((text, values) => sql.query(text, values), process.env);
  } else {
    isolatedAuthTarget(process.env);
    const sql = neon(isolatedDatabaseTarget(process.env).href);
    result = await reportWorldsMigrations((text, values) => sql.query(text, values), worldsPilotIssuer, process.env);
  }
  console.log(JSON.stringify(result));
} catch {
  console.error("Receipt delivery was not completed. Check the target and signing configuration, then retry.");
  process.exitCode = 1;
}
