# Dependency security checks

`npm run audit:dependencies` audits the complete installed dependency tree,
including packages declared as development dependencies that enter the Worker
bundle. CI runs this check, TypeScript, lint, translation coverage, unit tests,
the build and browser tests. The raw npm report is saved under
`test-results/dependency-audit.json`; failures remain visible in CI artifacts.

React, React DOM and the RSC decoder are kept on the same patched release.
The decoder is a production dependency. `fflate` is overridden to its compatible
patched 0.7.5 release because a transitive font dependency pins an older version.

## Former tooling exception removed on 2026-10-27

The former braces 3.0.3 exception concerned
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
GitHub withdrew that advisory on 2026-10-23 because it is not practically
exploitable. The current full npm audit no longer reports it. This is an upstream
withdrawal, not a claim that a new braces release fixed the issue.

The audit policy now contains **no accepted advisories**. Any reintroduced,
tooling or runtime finding fails CI. Repository-owned file globs remain separate
from user content; no application endpoint forwards contributed text to glob
parsers. Existing dependency versions need no speculative replacement for this
withdrawn advisory. The complete installed tree is still audited on every run.

## Security maintenance 2026-10-24

Updated Zod to 4.6.6 and constrained all transitive copies to that direct version
to address [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
Pinned compatible transitive security updates for Undici 7.30.1 and fast-uri 3.1.9;
the parent packages currently pin vulnerable older releases. These address the
Undici EventSource/SRI/content-encoding advisories and fast-uri normalization
advisories identified by the full audit on this date. The existing exception
is not broadened. Keep these pins until the parent packages support patched versions.

## Read limits and cache behavior

Public database-backed read endpoints are limited at the Worker before the
framework/database handler. Room reads have an aggregate hashed-IP allowance
for ten players behind one connection plus a separate per-player/room allowance.
Only public language and region registries use the shared 30-second cache.
Region creation invalidates its local cache. Rooms, contribution details,
account sessions and administration responses never enter this shared cache.
