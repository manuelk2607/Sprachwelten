import { test } from "node:test";
import assert from "node:assert/strict";
import { isolatedDatabaseTarget, isolatedAuthTarget } from "../lib/qa-target";
const env = {
  QA_DATABASE_APPROVED: "1",
  TEST_NEON_BRANCH: "br-test-only",
  TEST_DATABASE_HOST: "ep-qa-test.c-7.eu-central-1.aws.neon.tech",
  DATABASE_URL:
    "postgresql://qa:secret@ep-qa-test.c-7.eu-central-1.aws.neon.tech/sprachspiel?sslmode=require",
  NEON_AUTH_BASE_URL:
    "https://ep-qa-test.neonauth.c-7.eu-central-1.aws.neon.tech/sprachspiel/auth",
};
test("isolated QA guards reject production, ambiguous connections and foreign auth before any network call", () => {
  assert.equal(
    isolatedAuthTarget(env).hostname,
    "ep-qa-test.neonauth.c-7.eu-central-1.aws.neon.tech",
  );
  for (const change of [
    { QA_DATABASE_APPROVED: undefined },
    { TEST_NEON_BRANCH: "br-delicate-field-b96d9qc4" },
    { TEST_DATABASE_HOST: "other" },
    {
      DATABASE_URL: env.DATABASE_URL.replace(
        "ep-qa-test",
        "ep-ancient-night-b9a3flsm",
      ),
    },
    {
      DATABASE_URL: env.DATABASE_URL.replace("ep-qa-test", "ep-qa-test-pooler"),
    },
    {
      DATABASE_URL_UNPOOLED: env.DATABASE_URL.replace("/sprachspiel", "/other"),
    },
    { DATABASE_URL: env.DATABASE_URL.replace("postgresql:", "https:") },
  ])
    assert.throws(() => isolatedDatabaseTarget({ ...env, ...change }));
  for (const url of [
    env.NEON_AUTH_BASE_URL.replace("ep-qa-test", "ep-ancient-night-b9a3flsm"),
    env.NEON_AUTH_BASE_URL.replace("/sprachspiel/", "/other/"),
    env.NEON_AUTH_BASE_URL + "?token=bad",
  ])
    assert.throws(() =>
      isolatedAuthTarget({ ...env, NEON_AUTH_BASE_URL: url }),
    );
});
