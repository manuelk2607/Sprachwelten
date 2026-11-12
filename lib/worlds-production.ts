import { worldsPilotIssuer } from "./worlds-pilot.ts";

export const worldsProductionOrigin = "https://sprachwelten.maki26.workers.dev";
export const worldsProductionVariables = {
  WORLDS_PRODUCTION_ENABLED: "true",
  WORLDS_ISSUER: worldsPilotIssuer,
  WORLDS_CLIENT_ID: "nBYLdsjNgkrhTjZSgRtsxWYghUxBWwDc",
  WORLDS_RESOURCE: worldsProductionOrigin + "/api",
} as const;

export function isWorldsProductionTarget(env: Record<string, string | undefined>) {
  if (env.WORLDS_PILOT_ENABLED === "true" ||
      !Object.entries(worldsProductionVariables).every(([key, value]) => env[key] === value)) return false;
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    const host = db.hostname.replace(/-pooler\./, ".");
    return ["postgres:", "postgresql:"].includes(db.protocol) &&
      host === "ep-ancient-night-b9a3flsm.c-7.eu-central-1.aws.neon.tech" &&
      db.pathname === "/sprachspiel" &&
      env.NEON_AUTH_BASE_URL === "https://ep-ancient-night-b9a3flsm.neonauth.c-7.eu-central-1.aws.neon.tech/sprachspiel/auth";
  } catch {
    return false;
  }
}
