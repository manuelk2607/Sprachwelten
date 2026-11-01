# Room lifecycle and quiz follow-up

The review fixes were checked on the isolated QA branch, with no production test
accounts or administrator grants. Node 24 was used for local measurements.

| Check | Before | After |
| --- | --- | --- |
| Meaning-game start logic, 164 cards, warmed local runs | about 28 ms | mostly 1.5–2.5 ms |
| Ordinary heartbeat | room read + full state update + version change | one attendance query, no room state/version change |
| Poll after ordinary heartbeat | changed ETag and room body | unchanged ETag, HTTP 304 |
| Production dependency audit | 16 affected packages, including propagated reports | 0 known vulnerabilities |

The local timing excludes database/network wait and is not a production Worker
CPU profile. Shared answer pools remove repeated translation and most repeated
shuffling; category filters reduce database results for category-specific rooms.

Attendance is throttled to at most one row update per person per 15 seconds.
Normal clients send every 20 seconds. Stale-player reconciliation still changes
the game version and transfers the host when needed. Game mutations merge recent
private attendance before checking disconnects.

Live verification additionally found that Cloudflare's compression changes ETags
to weak validators (`W/"room-v0"`). The room API accepts both forms; membership
verification still runs before returning 304. This is covered by a regression test.

Regression coverage includes match-ID replay protection, legacy saved rooms,
available round limits, distinct senses and regions, valid-meaning exclusion from
automatic distractors, preserved HTTP validators and bounded expiry cleanup.
Existing auth, contribution, duplicate, game concurrency and browser suites pass.

Status reconciled 2026-10-27: project-wide lint and required CI checks are now green;
public/room read limits have also been implemented. This report preserves historical
measurements. Further push infrastructure or translation coalescing requires a
measured production bottleneck; it is not an outstanding mandatory refactor.
