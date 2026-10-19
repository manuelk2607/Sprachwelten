import { z } from "zod";
const advisory = z.object({
  dependency: z.string(),
  title: z.string(),
  url: z.string(),
  range: z.string(),
});
const auditSchema = z.object({
  vulnerabilities: z.record(
    z.string(),
    z.object({ via: z.array(z.union([z.string(), advisory])) }),
  ),
});
export function reviewDependencyAudit(input: unknown) {
  const report = auditSchema.parse(input);
  const findings = new Map<string, z.infer<typeof advisory>>();
  for (const vulnerability of Object.values(report.vulnerabilities))
    for (const item of vulnerability.via)
      if (typeof item !== "string") findings.set(item.url, item);
  const accepted: z.infer<typeof advisory>[] = [],
    blocked: z.infer<typeof advisory>[] = [];
  for (const finding of findings.values()) {
    // No fixed release exists. Only repository-owned file globs reach braces;
    // contributed text, paths and quiz answers never become compiler glob patterns.
    const toolingOnly =
      finding.dependency === "braces" &&
      finding.range === "<=3.0.3" &&
      finding.url === "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
    (toolingOnly ? accepted : blocked).push(finding);
  }
  return { accepted, blocked };
}
