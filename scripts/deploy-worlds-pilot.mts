import "./sites-env.mts";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { isolatedAuthTarget } from "../lib/qa-target.ts";
import {
  worldsPilotIssuer,
  worldsPilotOrigin,
  worldsPilotResource,
  worldsPilotWorker,
} from "../lib/worlds-pilot.ts";

const [mode, ...extraArgs] = process.argv.slice(2);
if (extraArgs.length || (mode !== "--dry-run" && mode !== "--deploy"))
  throw new Error("Select exactly one of --dry-run or --deploy.");

const deploy = mode === "--deploy";
const env = process.env;
const secretNames = [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
] as const;

if (deploy) {
  // Replace the standard Wrangler credential with the dedicated pilot credential.
  if (
    !env.WORLDS_PILOT_CLOUDFLARE_TOKEN ||
    !/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID ?? "")
  )
    throw new Error(
      "A dedicated pilot token and Cloudflare account ID are required.",
    );
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(env.WORLDS_PILOT_CLIENT_ID ?? ""))
    throw new Error("The registered Sprachwelten pilot client ID is required.");
  if (
    secretNames.some((name) => !env[name]?.trim()) ||
    (env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) < 32
  )
    throw new Error("Pilot database and authentication secrets are required.");

  try {
    isolatedAuthTarget(env);
    const sql = neon(env.DATABASE_URL!);
    const migrations =
      await sql`SELECT name FROM schema_migrations WHERE name = '029_worlds_legacy_sessions.sql'`;
    if (migrations.length !== 1) throw new Error();
  } catch {
    throw new Error(
      "Deployment requires the matching isolated Neon database and Auth endpoint with migration 029 applied.",
    );
  }
}

const output = path.resolve("dist/server");
const generated = JSON.parse(
  readFileSync(path.join(output, "wrangler.json"), "utf8"),
);
const configPath = path.join(output, "wrangler.worlds-pilot.json");
const config = {
  name: worldsPilotWorker,
  main: generated.main,
  no_bundle: generated.no_bundle,
  rules: generated.rules,
  compatibility_date: generated.compatibility_date,
  compatibility_flags: generated.compatibility_flags,
  workers_dev: true,
  preview_urls: false,
  assets: {
    directory: generated.assets.directory,
    binding: "PILOT_ASSETS",
    run_worker_first: true,
  },
  vars: {
    WORLDS_PILOT_ENABLED: "true",
    WORLDS_PILOT_ORIGIN: worldsPilotOrigin,
    WORLDS_PILOT_DATABASE_HOST: deploy
      ? env.TEST_DATABASE_HOST
      : "ep-worlds-test.example.neon.tech",
    WORLDS_CLIENT_ID: deploy
      ? env.WORLDS_PILOT_CLIENT_ID
      : "dry-run-only-client",
    WORLDS_ISSUER: worldsPilotIssuer,
    WORLDS_RESOURCE: worldsPilotResource,
  },
};
writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

const temporary = deploy
  ? mkdtempSync(path.join(tmpdir(), "sprachwelten-pilot-"))
  : undefined;
try {
  const args = [
    "node_modules/wrangler/bin/wrangler.js",
    "deploy",
    "--config",
    configPath,
  ];
  if (temporary) {
    const secretPath = path.join(temporary, "secrets.json");
    const secrets = Object.fromEntries(
      secretNames.map((name) => [name, env[name]]),
    );
    writeFileSync(secretPath, JSON.stringify(secrets), { mode: 0o600 });
    args.push("--secrets-file", secretPath);
  } else {
    args.push("--dry-run");
  }
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: {
      NODE_ENV: "production",
      PATH: env.PATH,
      TMPDIR: env.TMPDIR,
      XDG_CONFIG_HOME: temporary ?? output,
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_WRITE_LOGS: "false",
      ...(deploy && {
        CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: env.WORLDS_PILOT_CLOUDFLARE_TOKEN,
      }),
    },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
