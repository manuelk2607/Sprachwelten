import handler from "vinext/server/fetch-handler";
import { withRequestLocale } from "../lib/request-locale";
import { maintainApplication } from "../db/maintenance";
import { securityHeaders } from "../lib/security-headers";
import { guardReadRequest, type ReadLimitEnv } from "../lib/read-guard";
import { publicReadCacheKey } from "../lib/public-read-cache";
import { createWorldsConfig } from "../lib/auth/worlds";
import {
  worldsPilotIssuer,
  worldsPilotOrigin,
  worldsPilotResource,
} from "../lib/worlds-pilot";

type WorkerEnv = Cloudflare.Env & ReadLimitEnv & { PILOT_ASSETS?: Fetcher };

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
    env: Cloudflare.Env & { DATABASE_URL: string; AUDIO: R2Bucket },
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      maintainApplication(env.DATABASE_URL, env.AUDIO).then((result) => {
        console.info("Application maintenance", result);
      }),
    );
  },
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    if (env.PILOT_ASSETS || new URL(request.url).origin === worldsPilotOrigin)
      return fetchPilot(request, env, ctx);

    request = withRequestLocale(request);
    const denied = await guardReadRequest(request, env);
    if (denied) return securityHeaders(denied);
    const cacheKey = publicReadCacheKey(request);
    const regionWrite =
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/regions";
    const cache =
      cacheKey || regionWrite
        ? await caches.open("sprachwelten-public-registries")
        : null;
    if (cacheKey && cache) {
      const cached = await cache!.match(cacheKey);
      if (cached) return securityHeaders(cached);
    }
    const response = await handler.fetch(request, env, ctx);
    if (cacheKey && response.ok && !response.headers.has("Set-Cookie")) {
      const cached = new Response(response.clone().body, response);
      cached.headers.set("Cache-Control", "public, max-age=30");
      ctx.waitUntil(cache!.put(cacheKey, cached));
    }
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/api/regions" &&
      response.ok
    ) {
      await cache!.delete(new Request(new URL("/api/regions", request.url)));
    }
    return securityHeaders(response);
  },
};
