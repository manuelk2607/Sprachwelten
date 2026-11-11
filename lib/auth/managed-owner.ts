import {
  createAuthServer,
  NEON_AUTH_SESSION_COOKIE_NAME,
  resolveNeonAuthLogging,
} from "@neondatabase/auth/server";
import { sameOrigin } from "@worlds-hub/auth";
import type { ManagedSessionProof } from "@worlds-hub/auth/linking";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { GameError } from "../game";
import { prepareLegacyProjectAccount } from "./project-accounts";

export interface ManagedOwnerSettings {
  origin: string;
  issuer: string;
  cookieSecret: string;
}
const unavailable = () =>
  new GameError(
    "Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.",
    503,
  );
const date = (value: unknown) =>
  value instanceof Date
    ? value.getTime()
    : typeof value === "string"
      ? Date.parse(value)
      : NaN;

/** Server-only migration input. Settings must come from the already validated
 * isolated Worlds configuration, never from request parameters. Uses the
 * official SDK's request-context interface to omit its local session cache.
 * The browser's cookies are never changed or logged. Only its own native
 * session cookie is sent to this application's configured Managed Auth service. */
export async function readManagedSession(
  request: Request,
  settings: ManagedOwnerSettings,
  clock = Date.now,
) {
  if (new URL(request.url).origin !== settings.origin)
    throw new GameError("Diese Anfrage ist nicht erlaubt.", 403);
  const issuer = new URL(settings.issuer);
  if (
    issuer.protocol !== "https:" ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash ||
    !issuer.hostname.includes(".neonauth.") ||
    !issuer.hostname.endsWith(".neon.tech")
  )
    throw unavailable();
  const cookies = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(NEON_AUTH_SESSION_COOKIE_NAME + "="));
  if (
    cookies.length !== 1 ||
    cookies[0].length <= NEON_AUTH_SESSION_COOKIE_NAME.length + 1 ||
    cookies[0].length > 8192
  )
    throw new GameError(
      "Bitte melde dich an, um diese Funktion zu nutzen.",
      401,
    );
  const auth = createAuthServer({
    baseUrl: issuer.href,
    cookieSecret: settings.cookieSecret,
    sessionDataTtl: 1,
    log: resolveNeonAuthLogging({ logLevel: "silent" }),
    context: () => ({
      getCookies: () => cookies[0],
      setCookie: () => {},
      getHeader: () => null,
      getOrigin: () => settings.origin,
      getFramework: () => "nextjs",
    }),
  });
  // Start time bounds the provider observation even if delivery is delayed.
  const validatedAt = clock();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { data, error } = await Promise.race([
    auth.getSession({
      query: { disableCookieCache: true, disableRefresh: true },
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(unavailable()), 15_000);
    }),
  ]).finally(() => clearTimeout(timer));
  const receivedAt = clock();
  if (
    !Number.isFinite(validatedAt) ||
    receivedAt < validatedAt ||
    receivedAt - validatedAt >= 15_000
  )
    throw unavailable();
  if (error)
    throw error.status === 401 || error.status === 403
      ? new GameError("Bitte melde dich an, um diese Funktion zu nutzen.", 401)
      : unavailable();
  const user = data?.user,
    session = data?.session;
  if (!user || !session)
    throw new GameError(
      "Bitte melde dich an, um diese Funktion zu nutzen.",
      401,
    );
  const createdAt = date(session.createdAt),
    expiresAt = date(session.expiresAt);
  if (
    typeof user.id !== "string" ||
    !user.id ||
    typeof session.id !== "string" ||
    !session.id ||
    session.userId !== user.id ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    createdAt > validatedAt ||
    expiresAt <= receivedAt
  )
    throw unavailable();
  return {
    id: user.id,
    name: typeof user.name === "string" ? user.name : "Worlds",
    sessionId: session.id,
    createdAt,
    expiresAt,
    validatedAt,
  };
}
export async function loadManagedOwner(
  request: Request,
  settings: ManagedOwnerSettings,
  query: PgQuery,
  clock = Date.now,
): Promise<{ name: string; proof: ManagedSessionProof }> {
  if (request.method !== "POST" || !sameOrigin(request, settings.origin))
    throw new GameError("Diese Anfrage ist nicht erlaubt.", 403);
  const current = await readManagedSession(request, settings, clock);
  const id = await prepareLegacyProjectAccount(current.id, query);
  const [role] = await query(
    "SELECT EXISTS(SELECT 1 FROM app_admins WHERE user_id=$1::uuid) AS privileged",
    [id],
  );
  if (typeof role?.privileged !== "boolean") throw unavailable();
  return {
    name: current.name,
    proof: {
      kind: "managed-auth-session",
      issuer: new URL(settings.issuer).href,
      accountId: id,
      sessionId: current.sessionId,
      createdAt: current.createdAt,
      expiresAt: current.expiresAt,
      validatedAt: current.validatedAt,
      privileged: role.privileged,
    },
  };
}
