import { rateLimit } from "@/db/repository";
import { GameError } from "@/lib/game";
import { hashToken } from "@/lib/http";
import { worldsConfig, worldsQuery } from "@/lib/auth/learning-session";
import { worldsPaths, worldsRoute } from "@/lib/auth/worlds";

async function handle(request: Request) {
  const config = worldsConfig();
  const url = new URL(request.url);
  let response: Response;
  if (!config || url.origin !== config.origin || !worldsPaths.includes(url.pathname)) response = new Response(null, {status: 404});
  else {
    try {
      const ip = await hashToken(request.headers.get("cf-connecting-ip") ?? "local");
      await rateLimit("worlds:" + url.pathname + ":" + ip, url.pathname === "/auth/login" ? 12 : 60, 60);
      response = await worldsRoute(request, config, worldsQuery);
    } catch (error) {
      response = new Response(null, {status: error instanceof GameError ? error.status : 400});
    }
  }
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self' https:");
  return new Response(response.body, {status: response.status, headers});
}
export const GET = handle;
export const POST = handle;
