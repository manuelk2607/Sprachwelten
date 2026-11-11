import assert from "node:assert/strict";
import { isolatedAuthTarget } from "../lib/qa-target.ts";
import { worldsPilotOrigin } from "../lib/worlds-pilot.ts";

const env = process.env;
const project = "polished-wind-59150518";
assert.equal(
  env.QA_PROJECT,
  project,
  "Use only the dedicated Sprachwelten QA project.",
);
assert.ok(env.NEON_QA_API_KEY, "The QA project credential is required.");
assert.notEqual(
  env.TEST_NEON_BRANCH,
  "br-damp-glitter-baqvjq5l",
  "Use a disposable child branch.",
);
isolatedAuthTarget(env);

const response = await fetch(
  `https://console.neon.tech/api/v2/projects/${project}/branches/${env.TEST_NEON_BRANCH}/auth/domains`,
  {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${env.NEON_QA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: worldsPilotOrigin,
      auth_provider: "better_auth",
    }),
  },
);
await response.body?.cancel();
assert.equal(
  response.status,
  201,
  "Could not add the pilot origin to the disposable branch.",
);
console.log("Allowed only the public test origin on the disposable branch.");
