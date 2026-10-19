# Review fixes and performance follow-up

The changes were checked on the isolated `qa-review-fixes-20261019` Neon branch.
Production test accounts or administrator grants were not created. Temporary QA
administrator grants were removed after testing.

## Changes

- Configuring only the round count now performs the room read and optimistic
  update. It skips the extra room read and full prompt-pool query. Previously a
  mixed meaning pool could fetch up to 250 complete cards for this operation.
  Starting a game still loads and validates the current unplayed pool.
- Players who have submitted an answer poll every 2.5 seconds rather than every
  1.2 seconds, an upper-bound reduction from 50 to 24 polls per minute, excluding
  request latency. Active turns use 1.5 seconds; lobbies use 3 seconds and final
  scores 8 seconds. Visibility/online events still trigger an immediate refresh.
  Polls have a timeout and pause during the client's own mutation.
- Cloudflare read limiters run before database handlers. The shared registry
  cache lasts 30 seconds and excludes private/personalized endpoints. Successful
  region creation invalidates the local region-cache entry.
- Account/filter-scoped resources hide stale results immediately and avoid
  cascading resets when navigating between accounts, pages or filters.

## Verification

The integration suite checks unchanged auth/contribution/game behavior. A new
API suite verifies compatible bulk tasks, rejection of destructive conversions,
successful undo, stale-edit protection, two concurrent undo requests, administrator
revocation, rounds-only cached availability and authoritative start validation.

The existing query-size profile still reports 44 bytes returned by an unchanged
room-version query versus 2,665 bytes for a full projected state in its fixture.
This 98% reduction predates this change and is a regression measurement, not a
newly claimed improvement. Query median timings were about 34–37 ms and local
HTTP 304 median about 52 ms; these include the local network/database setup and
are not a production Worker CPU or load benchmark.

Polling remains database-backed. A push infrastructure migration is unnecessary
for this change and should be driven by measured concurrent usage.
