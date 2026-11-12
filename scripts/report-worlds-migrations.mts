import { neon } from "@neondatabase/serverless";
import { reportWorldsMigrations } from "../lib/auth/worlds-migration-receipts.ts";
import { isolatedAuthTarget, isolatedDatabaseTarget } from "../lib/qa-target.ts";
import { worldsPilotIssuer } from "../lib/worlds-pilot.ts";

try {
  if (process.argv.length !== 2) throw new Error("Unexpected argument.");
  isolatedAuthTarget(process.env);
  const sql = neon(isolatedDatabaseTarget(process.env).href);
  const result = await reportWorldsMigrations(
    (text, values) => sql.query(text, values),
    worldsPilotIssuer,
    process.env,
  );
  console.log(JSON.stringify(result));
} catch {
  console.error("Receipt delivery was not completed. Check the isolated target and signing configuration, then retry.");
  process.exitCode = 1;
}
