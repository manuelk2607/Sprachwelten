import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";
import { hash } from "@worlds-hub/auth/store";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { readManagedSession, type ManagedOwnerSettings } from "./managed-owner";
import { GameError } from "../game";

/** Input is exclusively the official server SDK's current session observation. */
export async function transitionUser(
  current: Awaited<ReturnType<typeof readManagedSession>>,
  query: PgQuery,
  revocationIssuer?: string,
) {
  const retainedFence = revocationIssuer
    ? ` AND NOT EXISTS (
    SELECT 1 FROM public.worlds_identity_links l
    JOIN public.worlds_session_revocations r USING(issuer,subject)
    WHERE l.local_user_id=a.id AND r.issuer=$3 AND r.revoked_through >= $4
  )`
    : "";
  const [row] = await query(
    `SELECT a.legacy_login_eligible AS eligible,a.legacy_cutover_at IS NOT NULL AS retired,
   (NOT a.disabled AND u.id IS NOT NULL AND (u.banned IS DISTINCT FROM true OR u."banExpires"<=now())) AS active,
   EXISTS(SELECT 1 FROM worlds_legacy_sessions g WHERE g.local_user_id=a.id
     AND g.session_hash=$2 AND g.expires_at>now())${retainedFence} AS retained
   FROM worlds_project_accounts a LEFT JOIN neon_auth."user" u ON u.id=a.legacy_user_id
   WHERE a.id=$1::uuid AND a.kind='legacy'`,
    [
      current.id,
      await hash(current.sessionId),
      // CAEP timestamps include the entire revocation second.
      ...(revocationIssuer
        ? [revocationIssuer, Math.floor(current.createdAt / 1000) * 1000]
        : []),
    ],
  );
  if (!row || row.eligible === false) return null;
  if (row.active !== true)
    throw new GameError(
      "Dieses Sprachwelten-Profil ist nicht verfügbar. Bitte wende dich an die Administration.",
      403,
    );
  if (typeof row?.retired !== "boolean" || typeof row.retained !== "boolean")
    throw new GameError(
      "Die Anmeldung konnte nicht geprüft werden. Bitte versuche es erneut.",
      503,
    );
  return row.retired && !row.retained
    ? null
    : { id: current.id, name: current.name };
}
export async function managedTransitionIdentity(
  request: Request,
  settings: ManagedOwnerSettings,
  query: PgQuery,
  revocationIssuer?: string,
) {
  try {
    const duplicates = (request.headers.get("cookie") ?? "")
      .split(";")
      .filter((value) =>
        value.trim().startsWith(NEON_AUTH_SESSION_COOKIE_NAME + "="),
      ).length;
    if (duplicates > 1)
      throw new GameError("Diese Anfrage ist nicht erlaubt.", 403);
    const current = await readManagedSession(request, settings);
    return {
      user: await transitionUser(current, query, revocationIssuer),
      error: null,
    };
  } catch (error) {
    // Expired/revoked credentials can fall back to a valid Worlds session.
    // Provider outages, local bans and ambiguous cookies remain fail-closed.
    return error instanceof GameError && error.status === 401
      ? { user: null, error: null }
      : { user: null, error };
  }
}
