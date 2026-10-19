import handler from "vinext/server/fetch-handler";
import { maintainApplication } from "../db/maintenance";
import { securityHeaders } from "../lib/security-headers";
import { guardReadRequest, type ReadLimitEnv } from "../lib/read-guard";
import { publicReadCacheKey } from "../lib/public-read-cache";
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
  async fetch(
    request: Request,
    env: Cloudflare.Env & ReadLimitEnv,
    ctx: ExecutionContext,
  ) {
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
