import "./sites-env.mts";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { neon } from "@neondatabase/serverless";
import { readLimitBindings } from "../lib/read-guard.ts";
import { isWorldsProductionTarget, worldsProductionVariables } from "../lib/worlds-production.ts";

const dryRun = process.argv.includes("--dry-run");
const accountId = "ec3c070d8e4f88d2fc533d7d797f2daa";
if (!dryRun) {
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== accountId) {
    throw new Error("Use the Cloudflare account that owns the production Sprachwelten Worker.");
  }
  if (!isWorldsProductionTarget({ ...process.env, ...worldsProductionVariables })) {
    throw new Error("Worlds requires the exact Sprachwelten production database and its native Auth endpoint.");
  }
  const sql = neon(process.env.DATABASE_URL!);
  const [ready] = await sql`SELECT
    to_regclass('public.worlds_auth_sessions') IS NOT NULL
    AND to_regclass('public.worlds_project_accounts') IS NOT NULL
    AND to_regclass('public.worlds_legacy_sessions') IS NOT NULL
    AND to_regclass('public.worlds_link_audit_pending_receipt') IS NOT NULL AS enabled`;
  if (ready?.enabled !== true) throw new Error("Run the tracked Sprachwelten migrations before enabling Worlds.");
}

const root = process.cwd();
const directory = path.join(root, "dist/server");
const config = JSON.parse(
  readFileSync(path.join(directory, "wrangler.json"), "utf8"),
);
// Generated build config is reused, with direct public routing in the owner's account.
config.name = "sprachwelten";
config.account_id = accountId;
config.workers_dev = true;
config.preview_urls = false;
config.triggers = { crons: ["17 3 * * *"] };
config.ratelimits = readLimitBindings;
config.ai = { binding: "AI" };
config.vars = { ...config.vars, ...worldsProductionVariables };
if(process.env.GOOGLE_SITE_VERIFICATION?.trim())config.vars={...config.vars,GOOGLE_SITE_VERIFICATION:process.env.GOOGLE_SITE_VERIFICATION.trim()};
config.r2_buckets = [
  ...(config.r2_buckets ?? []).filter(
    (bucket: { binding: string }) => bucket.binding !== "AUDIO",
  ),
  { binding: "AUDIO", bucket_name: "sprachwelten-audio" },
];
delete config.topLevelName;
delete config.routes;
delete config.route;
delete config.dispatch_namespaces;
const configPath = path.join(directory, "wrangler.direct.json");
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
const result = spawnSync(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js",
  "deploy",
  "--config",
  configPath,
  "--keep-vars",
  ...(dryRun ? ["--dry-run"] : []),
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
