import { backchannelLogout, callback, logout, session, startLogin, type AuthConfig } from "@worlds-hub/auth";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { PostgresAuthStore } from "@worlds-hub/auth/postgres-store";

export type LearningUser = { id: string; name: string };
export const worldsPaths = ["/auth/login", "/auth/callback", "/auth/logout", "/auth/backchannel-logout",
  "/auth/status", "/auth/worlds", "/auth/worlds-en"];
export const hasManagedSessionCookie = (request: Request) => (request.headers.get("cookie") ?? "").split(";")
  .some(value => value.trim().startsWith("__Secure-neon-auth.session_token="));

export function createWorldsConfig(env: Record<string, string | undefined>, query: PgQuery): AuthConfig | undefined {
  if (env.WORLDS_PILOT_ENABLED !== "true" || !env.WORLDS_CLIENT_ID || !env.WORLDS_ISSUER || !env.WORLDS_RESOURCE) return;
  try {
    const origin = new URL(env.WORLDS_PILOT_ORIGIN ?? "");
    const db = new URL(env.DATABASE_URL ?? "");
    const localAuth = new URL(env.NEON_AUTH_BASE_URL ?? "");
    const issuer = new URL(env.WORLDS_ISSUER);
    const endpoint = db.hostname.split(".")[0].replace(/-pooler$/, "");
    if (origin.protocol !== "https:" || origin.origin !== env.WORLDS_PILOT_ORIGIN ||
        origin.hostname === "sprachwelten.maki26.workers.dev" ||
        !["postgres:", "postgresql:"].includes(db.protocol) ||
        db.hostname !== env.WORLDS_PILOT_DATABASE_HOST ||
        db.hostname.startsWith("ep-ancient-night-b9a3flsm") ||
        localAuth.protocol !== "https:" || !localAuth.hostname.startsWith(endpoint + ".neonauth.") ||
        !localAuth.hostname.endsWith(".neon.tech") || localAuth.pathname !== db.pathname + "/auth" ||
        issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.search || issuer.hash) return;
    return {
      origin: origin.origin, issuer: issuer.href, resource: env.WORLDS_RESOURCE,
      clientId: env.WORLDS_CLIENT_ID, algorithm: "EdDSA", store: new PostgresAuthStore(query),
      returnPaths: ["/auth/worlds", "/auth/worlds-en"], signedOutPaths: {de: "/lernen", en: "/en/learn"},
    };
  } catch { return; }
}

export async function mappedLearningUser(request: Request, config: AuthConfig, query: PgQuery): Promise<LearningUser | undefined> {
  if (new URL(request.url).origin !== config.origin) return;
  const identity = await session(request, config);
  if (!identity) return;
  const [row] = await query(`
    SELECT u.id, u.name
    FROM worlds_identity_links l JOIN neon_auth."user" u ON u.id=l.local_user_id
    WHERE l.issuer=$1 AND l.subject=$2
      AND (u.banned IS DISTINCT FROM true OR u."banExpires" <= now())
  `, [identity.issuer, identity.sub]);
  if (typeof row?.id === "string" && typeof row.name === "string")
    return {id: row.id, name: row.name};
}

export async function worldsRoute(request: Request, config: AuthConfig, query: PgQuery) {
  const {pathname} = new URL(request.url);
  if (new URL(request.url).origin !== config.origin) return new Response(null, {status: 404});
  if (pathname === "/auth/login") return startLogin(request, config);
  if (pathname === "/auth/callback") return callback(request, config);
  if (pathname === "/auth/logout") return logout(request, config);
  if (pathname === "/auth/backchannel-logout") return backchannelLogout(request, config);
  if (!["/auth/status", "/auth/worlds", "/auth/worlds-en"].includes(pathname)) return new Response(null, {status: 404});
  if (request.method !== "GET") return new Response(null, {status: 405});
  const user = await mappedLearningUser(request, config, query);
  if (pathname === "/auth/status") return Response.json({user: hasManagedSessionCookie(request) ? null : user ?? null});
  const en = pathname === "/auth/worlds-en";
  const identity = await session(request, config);
  const title = en ? "Worlds sign-in" : "Worlds-Anmeldung";
  const continueLabel = en ? "Continue to learning" : "Weiter zum Lernen";
  const loginLabel = en ? "Sign in with Worlds" : "Mit Worlds anmelden";
  const logoutLabel = en ? "Sign out of Worlds in Sprachwelten" : "In Sprachwelten von Worlds abmelden";
  const learning = en ? "/en/learn" : "/lernen";
  const locale = en ? "en" : "de";
  const status = user && hasManagedSessionCookie(request)
    ? `<p>${en ? "Sign out of your current Sprachwelten account before switching to Worlds." : "Melde dich vor dem Wechsel zu Worlds von deinem aktuellen Sprachwelten-Konto ab."}</p><p><a href="${learning}">${en ? "Return to learning" : "Zurück zum Lernen"}</a></p>`
    : user ? `<p><a href="${learning}">${continueLabel}</a></p>` : identity
    ? `<p>${en ? "This Worlds identity has no linked Sprachwelten account." : "Diese Worlds-Identität ist noch keinem Sprachwelten-Konto zugeordnet."}</p>`
    : `<form method="post" action="/auth/login?next=${pathname}&amp;ui_locales=${locale}"><button>${loginLabel}</button></form>`;
  const signOut = identity && /^[A-Za-z0-9_-]{32,128}$/.test(identity.csrf)
    ? `<form method="post" action="/auth/logout?locale=${locale}"><input type="hidden" name="csrf" value="${identity.csrf}"><button>${logoutLabel}</button></form>`
    : "";
  return new Response(`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title} | Sprachwelten</title><main><h1>${title}</h1>${status}${signOut}</main></html>`,
    {headers: {"content-type": "text/html; charset=utf-8"}});
}
