import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { sameOrigin, session, type AuthConfig } from "@worlds-hub/auth";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { mappedProjectAccount } from "./project-accounts";

const migrationPaths = new Set([
  "sign-in/email",
  "request-password-reset",
  "reset-password",
  "email-otp/send-verification-otp",
  "email-otp/verify-email",
]);
/** Wrap the existing SDK handler only in the isolated Worlds mode. No new
 * credentials protocol: native sign-in is exclusively a one-time owner proof. */
export async function nativeTransitionRoute(
  request: Request,
  path: string,
  config: AuthConfig,
  query: PgQuery,
  forward: (request: Request, pathOverride?: string) => Promise<Response>,
) {
  const denied = (status = 403) =>
    Response.json(
      status >= 500
        ? {
            code: "IDENTITY_UNAVAILABLE",
            message: "Die Anmeldung ist gerade nicht erreichbar.",
          }
        : {
            code: "WORLDS_SIGN_IN_REQUIRED",
            message: "Verwalte dein Konto im Worlds Hub.",
          },
      {
        status,
        headers: {
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      },
    );
  if (new URL(request.url).origin !== config.origin) return denied(421);
  if (path === "get-session" && request.method === "GET") {
    const url = new URL(request.url);
    url.searchParams.set("disableCookieCache", "true");
    url.searchParams.set("disableRefresh", "true");
    const headers = new Headers(request.headers);
    headers.delete("authorization");
    // The SDK's browser cache must never bypass a direct provider observation.
    headers.set(
      "cookie",
      (request.headers.get("cookie") ?? "")
        .split(";")
        .map((value) => value.trim())
        .filter((value) =>
          value.startsWith(NEON_AUTH_SESSION_COOKIE_NAME + "="),
        )
        .join("; "),
    );
    return forward(new Request(url, { method: "GET", headers }));
  }
  if (request.method !== "POST" || !sameOrigin(request, config.origin))
    return denied();
  if (path === "sign-out") return forward(request);
  if (!migrationPaths.has(path)) return denied();
  const current = await session(request, config);
  if (
    !current ||
    !current.email ||
    (await mappedProjectAccount(current, query))
  )
    return denied();
  const response = await forward(request);
  if (path !== "sign-in/email" || !response.ok) return response;
  let id: unknown;
  try {
    id = ((await response.clone().json()) as { user?: { id?: unknown } }).user
      ?.id;
  } catch {
    /* Do not expose an unconfirmed native session. */
  }
  let account: Record<string, unknown> | undefined,
    lookupFailed = typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id);
  if (!lookupFailed)
    try {
      [account] = await query(
        "SELECT legacy_login_eligible AND legacy_cutover_at IS NULL AND NOT disabled AS eligible FROM worlds_project_accounts WHERE id=$1::uuid AND kind='legacy'",
        [id],
      );
    } catch {
      lookupFailed = true;
    }
  if (account?.eligible === true) return response;
  // An unmapped central account must not open a fresh native session of an
  // already linked target. End exactly the newly issued session before denial;
  // withhold its body/cookies and preserve the browser's original native cookie.
  const issued = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .filter(
      (value) =>
        value.startsWith(NEON_AUTH_SESSION_COOKIE_NAME + "=") &&
        value.length > NEON_AUTH_SESSION_COOKIE_NAME.length + 1,
    );
  if (issued.length !== 1) return denied(503);
  const ended = await forward(
    new Request(config.origin + "/api/auth/sign-out", {
      method: "POST",
      headers: {
        origin: config.origin,
        cookie: issued[0],
        "content-type": "application/json",
      },
      body: "{}",
    }),
    "sign-out",
  );
  return ended.ok || ended.status === 401
    ? denied(lookupFailed ? 503 : 403)
    : denied(503);
}
