import test from "node:test";
import assert from "node:assert/strict";
import { reviewDependencyAudit } from "../scripts/audit-policy";
test("the full dependency audit has no exceptions and blocks runtime, tooling or reintroduced advisories", () => {
  const glob = {
    dependency: "braces",
    title: "Glob recursion",
    range: "<=3.0.3",
    url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  };
  const runtime = {
    dependency: "react-server-dom-webpack",
    title: "Server decoder DoS",
    range: "<19.2.8",
    url: "https://github.com/advisories/GHSA-wx67-qw84-cm4g",
  };
  const result = reviewDependencyAudit({
    vulnerabilities: {
      braces: { via: [glob] },
      vinext: { via: ["braces"] },
      "react-server-dom-webpack": { via: [runtime] },
    },
  });
  assert.deepEqual(result.accepted, []);
  assert.deepEqual(result.blocked, [glob, runtime]);
  assert.equal(
    reviewDependencyAudit({
      vulnerabilities: {
        braces: {
          via: [{ ...glob, url: "https://example.test/new-advisory" }],
        },
      },
    }).blocked.length,
    1,
  );
  assert.throws(() => reviewDependencyAudit({ error: "Registry unavailable" }));
});
