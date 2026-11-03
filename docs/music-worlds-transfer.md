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
