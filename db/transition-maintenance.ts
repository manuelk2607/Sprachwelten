import type { PgQuery } from "@worlds-hub/auth/postgres-links";

/** Older production schemas and rollback deployments remain compatible. */
export async function maintainWorldsTransitions(query: PgQuery) {
  const [state] = await query(
    "SELECT to_regclass('public.worlds_legacy_sessions') IS NOT NULL AS enabled",
    [],
  );
  if (state?.enabled !== true) return 0;
  const removed = await query(
    `DELETE FROM public.worlds_legacy_sessions
  WHERE (local_user_id,session_hash) IN (
   SELECT local_user_id,session_hash FROM public.worlds_legacy_sessions
   WHERE expires_at<=now() ORDER BY expires_at,local_user_id,session_hash LIMIT 500
  ) RETURNING 1 AS removed`,
    [],
  );
  return removed.length;
}
