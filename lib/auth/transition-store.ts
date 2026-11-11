import { PostgresAuthStore } from "@worlds-hub/auth/postgres-store";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";

/** Verified central revocation must also end the temporary native fallback. */
export class TransitionAuthStore extends PostgresAuthStore {
  constructor(private transitionQuery: PgQuery) {
    super(transitionQuery);
  }
  override async revokeIdentity(issuer: string, sub?: string, sid?: string) {
    if (!sub && !sid) throw new Error("Missing identity");
    await this.transitionQuery(
      `WITH targets AS (
    SELECT DISTINCT subject FROM public.worlds_auth_sessions
    WHERE issuer=$1 AND ($2::text IS NULL OR subject=$2) AND ($3::text IS NULL OR sid=$3)
    UNION SELECT $2::text WHERE $2::text IS NOT NULL
   ), ended AS (
    DELETE FROM public.worlds_auth_sessions WHERE issuer=$1
      AND ($2::text IS NULL OR subject=$2) AND ($3::text IS NULL OR sid=$3)
   ) DELETE FROM public.worlds_legacy_sessions g USING public.worlds_identity_links l
   WHERE g.local_user_id=l.local_user_id AND l.issuer=$1
     AND l.subject IN (SELECT subject FROM targets)`,
      [issuer, sub ?? null, sid ?? null],
    );
  }
}
