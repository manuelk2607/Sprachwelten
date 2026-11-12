# Music-Worlds cutover — 04.11.2026

Destination: https://music-worlds.maki26.workers.dev/ ; https://github.com/manuelk2607/Music-Worlds (private).

The eight production song rows at source commit 933c841 were exported read-only together with all dependent entry_id records, translations, source revisions/ownership references and referenced audio metadata. No dependent records, audio files or active song rooms existed. The restricted archive is outside Git in the Music-Worlds checkout under private/legacy; SHA-256 and restoration into an isolated QA schema passed. Source rows remain intact.

Music-Worlds retains all eight original IDs and legacy mappings. Four historical English text questions have individual public-domain reviews (Newton/Taylor, historical editions and author dates); four French questions remain private pending dated edition/rights evidence. No modern recording or lyrics have been copied. Eight additional newly authored hints are live. Target TypeScript/lint/unit/real PostgreSQL integration, two-client browser reload/vote/scoring and production smoke passed. Details and rights sources are tracked in the destination repository.

This cutover restricts new rooms/configuration, new contributions, live pool queries and public collection pagination to person quotes in Sprachwelten, with a normal link to Music-Worlds. Public song detail requests remain available to the owner for archive management; admin/own editing and the stored song schema/engine are retained. Existing running saved decks can finish; a new match loads person-only prompts. No source data is deleted or reassigned. No user account is inferred from a display name.

Rollback: revert this source change to restore selectors/pools; source rows are unchanged. Destination remains independent. Before any later destructive cleanup, compare export/source revisions, retain the private archive and wait for saved rooms to expire. No destructive cleanup is part of this cutover.
