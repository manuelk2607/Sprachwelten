import assert from "node:assert/strict";

const productionEndpoint = "ep-ancient-night-b9a3flsm";
export function isolatedDatabaseTarget(
  env: Record<string, string | undefined>,
) {
  assert.equal(
    env.QA_DATABASE_APPROVED,
    "1",
    "QA_DATABASE_APPROVED=1 must explicitly authorize this disposable target.",
  );
  const url = new URL(env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL ?? "");
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.ok(
    url.hostname.endsWith(".neon.tech") && url.hostname.startsWith("ep-"),
  );
  assert.ok(
    !url.hostname.includes("-pooler") &&
      !url.hostname.startsWith(productionEndpoint),
  );
  assert.equal(
    url.hostname,
    env.TEST_DATABASE_HOST,
    "The explicit QA host must match the connection.",
  );
  assert.match(env.TEST_NEON_BRANCH ?? "", /^br-[a-z0-9-]+$/);
  assert.notEqual(env.TEST_NEON_BRANCH, "br-delicate-field-b96d9qc4");
  if (env.DATABASE_URL)
    assert.equal(
      new URL(env.DATABASE_URL).href,
      url.href,
      "Both connections must identify the same direct QA database.",
    );
  return url;
}

export function isolatedAuthTarget(env: Record<string, string | undefined>) {
  const db = isolatedDatabaseTarget(env),
    auth = new URL(env.NEON_AUTH_BASE_URL ?? "");
  const endpoint = db.hostname.split(".")[0];
  assert.equal(auth.protocol, "https:");
  assert.ok(
    auth.hostname.startsWith(endpoint + ".neonauth.") &&
      auth.hostname.endsWith(".neon.tech"),
    "Auth must belong to the same isolated database endpoint.",
  );
  assert.ok(!auth.username && !auth.password && !auth.search && !auth.hash);
  assert.equal(auth.pathname, db.pathname + "/auth");
  return auth;
}
