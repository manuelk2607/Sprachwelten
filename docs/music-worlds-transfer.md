Historical preparation notes (superseded by the cutover record below):
# Music-Worlds transfer checkpoint

Status: source extraction prepared; production cutover deliberately pending a verified content archive and destination integration. No song data, audio, lyrics, users or saved rooms have been deleted. Music-Worlds has not been inspected or modified.

## Existing implementation inventory

Songs are `content_entries.kind=attribution`, `challenge.type=attribution`, `challenge.category=song`; people use the same mode `who-said-it`. There is no independent music API. `challenge.answer` is the title, `artist`, `aliases`, `alternatives`, optional `album`; entry `hint`, `translations`, `language`, `presentation`, `audio_id` and source URL supply supporting fields.

- `lib/attribution.ts`: title-only alternatives, alias collision checks, same-category automatic distractors.
- `lib/game.ts`: private quiz options, individual +1 points, reveal projection, current-card hint/album; shared lifecycle, rematches, history and departures.
- `lib/game-pool.ts`, `db/repository.ts`: category-filtered pool and persistence; `lib/game-difficulty.ts`: review coverage.
- `components/challenge-editor.tsx`, `contribute-dialog.tsx`, `challenge-details.tsx`: author/edit/display.
- `components/game-room.tsx`, `room-form.tsx`, `room-settings.tsx`: multiplayer UI, category selection and progressive helpers.
- `/api/rooms`, `/api/rooms/:code`, `/api/entries`, own/admin endpoints: shared authorization, revision/concurrency, quota and contribution management. Preserve these for other games.
- `lib/modes.ts`, mode guides, translation dictionaries and SEO descriptions: public mixed person/song descriptions.
- `tests/song-hints.test.ts`, `tests/browser/song-hints.spec.ts`, attribution cases in game suites: retained reference regression tests.

## Portable core

`transfer/music-worlds/quiz.ts` has no runtime dependencies: two task kinds (audio/text), explicit rights evidence, four distinct title answers, server-side shuffling with opaque IDs, +1 scoring, staged hint then album. It contains no media, lyrics or existing contribution content. It is a core, not a complete standalone application.

## Required destination integration

1. Adapt authentication and room persistence; author IDs cannot be inferred from display names. Keep opaque player tokens, membership checks, match/round IDs and atomic version checks from the shared engine.
2. Store `correctId` only on the server. Publish only current prompt and shuffled options; reveal solutions after all votes. Reject repeated votes/stale actions; score once, transfer departing hosts, preserve history on rematches.
3. Supply accessible DE/EN UI and current-round helper state; reset hint/album on round or match changes. Reuse source UI as reference rather than importing its entire dependency graph.
4. Implement rights-reviewed text and private audio storage. A source link alone is not permission. Do not export audio bytes or text excerpts until evidence is checked; retain blocked entries in the source archive.
5. Run extracted core tests and port existing multiplayer/browser cases against the destination service, including two clients, reloads, leave/rejoin, hidden answers, timeout and concurrent votes.

## Archive and cutover gate

Create an access-restricted, checksummed export of song rows including IDs, revisions, translations, source URLs, author ownership and referenced audio metadata, plus dependent explanations, moderation history, suggestions and review records. Store it outside Git; verify counts and restoration in an isolated target. Keep the original database rows intact. Only transfer rights-cleared content to Music-Worlds. A full database backup is not a safe public content export.

Once that archive is verified, restrict new `who-said-it` creation/configuration and live pool queries to `person`, remove song selectors from start/lobby/new-contribution UI and rewrite mixed descriptions in DE/EN. Preserve legacy saved song rounds and owner/admin editing of archived data. Exclude song rows from collection queries before pagination. Retain engine song compatibility until saved rooms expire and destination tests pass. Then remove only unreachable song UI and helpers. Do not delete the shared attribution schema, engine or person-quote tests.

Outstanding: verified private production archive, destination repository/architecture, rights review, destination integration and parity tests, followed by source selection removal and deployment. No production cutover is claimed at this checkpoint.
# Music-Worlds cutover — 04.11.2026

Destination: https://music-worlds.maki26.workers.dev/ ; https://github.com/manuelk2607/Music-Worlds (private).

The eight production song rows at source commit 933c841 were exported read-only together with all dependent entry_id records, translations, source revisions/ownership references and referenced audio metadata. No dependent records, audio files or active song rooms existed. The restricted archive is outside Git in the Music-Worlds checkout under private/legacy; SHA-256 and restoration into an isolated QA schema passed. Source rows remain intact.

Music-Worlds retains all eight original IDs and legacy mappings. Four historical English text questions have individual public-domain reviews (Newton/Taylor, historical editions and author dates); four French questions remain private pending dated edition/rights evidence. No modern recording or lyrics have been copied. Eight additional newly authored hints are live. Target TypeScript/lint/unit/real PostgreSQL integration, two-client browser reload/vote/scoring and production smoke passed. Details and rights sources are tracked in the destination repository.

This cutover restricts new rooms/configuration, new contributions, live pool queries and public collection pagination to person quotes in Sprachwelten, with a normal link to Music-Worlds. Public song detail requests remain available to the owner for archive management; admin/own editing and the stored song schema/engine are retained. Existing running saved decks can finish; a new match loads person-only prompts. No source data is deleted or reassigned. No user account is inferred from a display name.

Rollback: revert this source change to restore selectors/pools; source rows are unchanged. Destination remains independent. Before any later destructive cleanup, compare export/source revisions, retain the private archive and wait for saved rooms to expire. No destructive cleanup is part of this cutover.
