import handler from "vinext/server/fetch-handler";
import { neon } from "@neondatabase/serverless";
import { withRequestLocale } from "../lib/request-locale";
import { maintainApplication } from "../db/maintenance";
import { securityHeaders } from "../lib/security-headers";
import { guardReadRequest, type ReadLimitEnv } from "../lib/read-guard";
import { publicReadCacheKey } from "../lib/public-read-cache";
import { createWorldsConfig } from "../lib/auth/worlds";
import { reportProductionWorldsMigrations } from "../lib/auth/worlds-migration-receipts";
import { worldsProductionOrigin } from "../lib/worlds-production";
import {
  worldsPilotIssuer,
  worldsPilotOrigin,
  worldsPilotResource,
} from "../lib/worlds-pilot";

type WorkerEnv = Cloudflare.Env & ReadLimitEnv & {
  PILOT_ASSETS?: Fetcher;
  AUDIO: R2Bucket;
  WORLDS_PILOT_ENABLED?: string;
  WORLDS_PRODUCTION_ENABLED?: string;
  WORLDS_ISSUER?: string;
  WORLDS_CLIENT_ID?: string;
  WORLDS_RESOURCE?: string;
  WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK?: string;
};

function queueMigrationReceipts(env: WorkerEnv, ctx: ExecutionContext) {
  if (!env.WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK) return;
  ctx.waitUntil(
    reportProductionWorldsMigrations(
      (sql, params) => neon(env.DATABASE_URL).query(sql, params),
      {
        DATABASE_URL: env.DATABASE_URL,
        NEON_AUTH_BASE_URL: env.NEON_AUTH_BASE_URL,
        WORLDS_PILOT_ENABLED: env.WORLDS_PILOT_ENABLED,
        WORLDS_PRODUCTION_ENABLED: env.WORLDS_PRODUCTION_ENABLED,
        WORLDS_ISSUER: env.WORLDS_ISSUER,
        WORLDS_CLIENT_ID: env.WORLDS_CLIENT_ID,
        WORLDS_RESOURCE: env.WORLDS_RESOURCE,
        WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK: env.WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK,
      },
    ).then((result) => {
      if (result && (result.acknowledged || result.conflict))
        console.info("Worlds migration receipts", result);
    }).catch(() => {
      throw new Error("Worlds migration receipt delivery needs a retry");
    }),
  );
}

function pilotHeaders(response: Response) {
  const secured = securityHeaders(response);
  secured.headers.set("X-Robots-Tag", "noindex, nofollow");
  secured.headers.set("Cache-Control", "private, no-store");
  return secured;
}

async function fetchPilot(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
) {
  const url = new URL(request.url);
  if (url.pathname === "/robots.txt")
    return pilotHeaders(new Response("User-agent: *\nDisallow: /\n"));

  if (
    !env.PILOT_ASSETS ||
    url.origin !== worldsPilotOrigin ||
    process.env.WORLDS_PILOT_ORIGIN !== worldsPilotOrigin ||
    process.env.WORLDS_ISSUER !== worldsPilotIssuer ||
    process.env.WORLDS_RESOURCE !== worldsPilotResource ||
    (process.env.NEON_AUTH_COOKIE_SECRET?.length ?? 0) < 32 ||
    !createWorldsConfig(process.env, async () => [])
  ) {
    const locale = withRequestLocale(request).headers.get(
      "x-sprachwelten-locale",
    );
    const message =
      locale === "en"
        ? "The Sprachwelten test site is temporarily unavailable."
        : "Die Sprachwelten-Testseite ist vorübergehend nicht verfügbar.";
    return pilotHeaders(
      new Response(message, {
        status: 503,
        headers: { "Content-Language": locale ?? "de", "Retry-After": "300" },
      }),
    );
  }

  if (url.pathname === "/sitemap.xml")
    return pilotHeaders(new Response(null, { status: 404 }));

  if (request.method === "GET" || request.method === "HEAD") {
    const asset = await env.PILOT_ASSETS.fetch(request);
    if (asset.status !== 404) return pilotHeaders(asset);
  }

  const denied = await guardReadRequest(request, env);
  return pilotHeaders(
    denied ?? (await handler.fetch(withRequestLocale(request), env, ctx)),
  );
}

export default {
  scheduled(
    _event: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ) {
    queueMigrationReceipts(env, ctx);
    ctx.waitUntil(
      maintainApplication(env.DATABASE_URL, env.AUDIO).then((result) => {
        console.info("Application maintenance", result);
      }),
    );
  },
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (env.PILOT_ASSETS || url.origin === worldsPilotOrigin)
      return fetchPilot(request, env, ctx);

    request = withRequestLocale(request);
    const denied = await guardReadRequest(request, env);
    if (denied) return securityHeaders(denied);
    const cacheKey = publicReadCacheKey(request);
    const regionWrite =
      request.method === "POST" &&
      url.pathname === "/api/regions";
    const cache =
      cacheKey || regionWrite
        ? await caches.open("sprachwelten-public-registries")
        : null;
    if (cacheKey && cache) {
      const cached = await cache!.match(cacheKey);
      if (cached) return securityHeaders(cached);
    }
    const response = await handler.fetch(request, env, ctx);
    if (request.method === "POST" && response.status === 303 &&
        url.origin === worldsProductionOrigin && url.pathname === "/auth/worlds/confirm") {
      queueMigrationReceipts(env, ctx);
    }
    if (cacheKey && response.ok && !response.headers.has("Set-Cookie")) {
      const cached = new Response(response.clone().body, response);
      cached.headers.set("Cache-Control", "public, max-age=30");
      ctx.waitUntil(cache!.put(cacheKey, cached));
    }
    if (regionWrite && response.ok) {
      await cache!.delete(new Request(new URL("/api/regions", url)));
    }
    return securityHeaders(response);
  },
};
