import { migrationReceiptSender } from "@worlds-hub/auth/migration-receipts";
import type { PgQuery } from "@worlds-hub/auth/postgres-links";
import { isWorldsProductionTarget, worldsProductionOrigin, worldsProductionVariables } from "../worlds-production";

const productionHub = "https://worlds-hub.maki26.workers.dev";

export async function reportWorldsMigrations(
  query: PgQuery,
  identityIssuer: string,
  env: Record<string, string | undefined>,
) {
  const {
    WORLDS_RECEIPT_URL: url,
    WORLDS_RECEIPT_KID: kid,
    WORLDS_RECEIPT_KEY: privateJwk,
  } = env;
  if (!url || !kid || !privateJwk || new URL(url).hostname === new URL(productionHub).hostname) {
    throw new Error("An isolated Hub and dedicated receipt signing key are required.");
  }
  return deliverMigrationReceipts(query, identityIssuer, url, kid, privateJwk);
}

export async function reportProductionWorldsMigrations(
  query: PgQuery,
  env: Record<string, string | undefined>,
) {
  const privateJwk = env.WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK;
  if (!privateJwk) return;
  if (!isWorldsProductionTarget(env)) {
    throw new Error("Migration receipts require the exact Sprachwelten production target.");
  }
  let kid: unknown;
  try { kid = JSON.parse(privateJwk)?.kid; } catch { /* invalid configuration */ }
  if (typeof kid !== "string") throw new Error("A dedicated receipt signing key is required.");
  return deliverMigrationReceipts(
    query,
    worldsProductionVariables.WORLDS_ISSUER,
    productionHub + "/api/migrations/receipts/sprachwelten",
    kid,
    privateJwk,
  );
}

async function deliverMigrationReceipts(
  query: PgQuery,
  identityIssuer: string,
  url: string,
  kid: string,
  privateJwk: string,
) {
  const send = await migrationReceiptSender({
    project: "sprachwelten",
    origin: worldsProductionOrigin,
    identityIssuer,
    url,
    kid,
    privateJwk,
  });
  const pending = await query(
    `SELECT id::text AS revision,subject,local_user_id,event
    FROM public.worlds_link_audit
    WHERE issuer=$1 AND receipt_eligible AND receipt_reported_at IS NULL AND receipt_conflict_at IS NULL
    ORDER BY id LIMIT 10`,
    [identityIssuer],
  );
  const totals = { acknowledged: 0, conflict: 0 };
  for (const row of pending) {
    if (typeof row.subject !== "string" || typeof row.local_user_id !== "string" ||
        (row.event !== "linked" && row.event !== "unlinked")) {
      throw new Error("Invalid Worlds link audit entry.");
    }
    const revision = Number(row.revision);
    const result = await send({
      subject: row.subject,
      localAccountId: row.local_user_id,
      revision,
      state: row.event === "linked" ? "confirmed" : "revoked",
    });
    const [written] = await query(
      `UPDATE public.worlds_link_audit
      SET receipt_reported_at=CASE WHEN $3 THEN now() END,
          receipt_conflict_at=CASE WHEN $3 THEN NULL ELSE now() END
      WHERE id=$1 AND issuer=$2 AND receipt_reported_at IS NULL AND receipt_conflict_at IS NULL
      RETURNING id`,
      [revision, identityIssuer, result === "acknowledged"],
    );
    if (written) totals[result]++;
  }
  return totals;
}
