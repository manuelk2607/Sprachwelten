# Dependency security checks

`npm run audit:dependencies` audits the complete installed dependency tree,
including packages declared as development dependencies that enter the Worker
bundle. CI runs this check, TypeScript, lint, translation coverage, unit tests,
the build and browser tests. The raw npm report is saved under
`test-results/dependency-audit.json`; failures remain visible in CI artifacts.

React, React DOM and the RSC decoder are kept on the same patched release.
The decoder is a production dependency. `fflate` is overridden to its compatible
patched 0.7.5 release because a transitive font dependency pins an older version.

## Unpatched tooling advisory

As reviewed on 2026-10-19, braces 3.0.3 has no fixed published release for
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
Its recursive glob processing is used by the toolchain with repository-owned
file patterns. No application endpoint accepts glob patterns or passes user
content to braces, micromatch or fast-glob.

The audit policy accepts only that exact advisory, dependency and affected range;
it does not ignore the propagated package names or any other/new advisory.
Review this exception when upgrading the toolchain, when a patched release
appears, or before adding any feature that accepts user-defined glob patterns.
The raw npm audit therefore still reports this advisory and its dependent
packages. It must not be described as a vulnerability-free dependency tree.

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
