# Quality and performance verification, 17 October 2026

Measured against the isolated Neon QA branch, with a persisted one-player joke
round and six discovery entries. SQL measurements alternate old/new queries;
medians exclude two warm-up iterations and include ten subsequent samples.
These are small-dataset measurements, not a capacity or load test.

| Path | Before | After |
| --- | ---: | ---: |
| Unchanged room, JSON transferred from database | 2,558 bytes | 44 bytes (98% less) |
| Unchanged room, HTTP response body | Full room projection | 0 bytes (authenticated 304) |
| Room SQL round trip, median | 34.5 ms | 33.2 ms |
| Local unchanged-room HTTP request, median | — | 44.4 ms |
| Six discovery rows, JSON transferred from database | 7,652 bytes / 26 fields | 1,231 bytes / 6 fields (84% less) |
| Admin badge, queries after authorization | 4 | 1 |

The principal gain is lower transfer and less repeated rendering, rather than a
material improvement in SQL latency. Active rounds keep their 1.2-second polling
interval. Lobby/reveal polls use 2 seconds; finished rooms use 4 seconds. Hidden
tabs pause polling and resume immediately when visible. Failed requests back off
up to 15 seconds, with an immediate retry when connectivity returns.

The room version is checked in the same SQL request as player membership. A
matching ETag cannot authorize a non-member. Mutations still use optimistic
concurrency; future cards never enter polling responses. Local actions invalidate
the client's ETag so an optimistic view is reconciled with the server.

`pg_stat_statements` was not enabled in production. No production statistics were
reset and no extension or infrastructure tier was added. Read-only production
inspection found five live rooms, with a 775-byte average and a 2,945-byte maximum
stored polling state at that instant. This does not indicate a need for new room
infrastructure. Reassess push updates or database indexing with representative
traffic if latency or query volume becomes problematic.

Reproduce with a running isolated QA server:

```sh
node --env-file=.env.admin-qa.local --import tsx scripts/profile-performance.mts
node --env-file=.env.admin-qa.local --import tsx scripts/test-audio-retention.mts
```

Browser CI uses mocked API responses and needs no database credentials. It covers
mobile/desktop game cards and English UI, region failures/retry and closing
selection menus, field focus on invalid submissions, and personal suggestion
statuses. Database-backed tests additionally cover ownership, private admin notes,
review feedback, audio snapshots after soft deletion, access revocation, range
requests, cleanup grace periods and persistent R2 deletion retries.
