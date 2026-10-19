import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { reviewDependencyAudit } from "./audit-policy";
const result = spawnSync(
  "npm",
  ["audit", "--json", "--cache", path.join(tmpdir(), "sprachwelten-npm-cache")],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
if (result.error) throw result.error;
const report: unknown = JSON.parse(result.stdout);
mkdirSync("test-results", { recursive: true });
writeFileSync(
  "test-results/dependency-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
const { accepted, blocked } = reviewDependencyAudit(report);
for (const finding of accepted)
  console.warn(
    `Documented tooling advisory (no patched release): ${finding.dependency} ${finding.url}. See docs/security.md.`,
  );
for (const finding of blocked)
  console.error(`${finding.dependency}: ${finding.title} ${finding.url}`);
if (blocked.length) process.exitCode = 1;
else console.log("Full dependency audit passed: no unreviewed advisories.");
