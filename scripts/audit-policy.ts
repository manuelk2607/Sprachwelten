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
    // The former braces advisory was withdrawn upstream on 2026-10-23.
    // No allowlist remains: reintroduced or new findings fail closed.
    blocked.push(finding);
  }
  return { accepted, blocked };
}
