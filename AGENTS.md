# Sprachwelten

Sprachwelten is a separate application. Do not copy or alter code from sibling projects.

Primary production is the owner’s Cloudflare Worker `sprachwelten`: https://sprachwelten.maki26.workers.dev. Publish updates with `npm run deploy:cloudflare` after building. The `.openai/hosting.json` ID refers to the earlier, separate Sites publication; do not deploy there unless the user asks. Preserve existing server secrets and the current Neon database/auth project.

- Write all owned application code, configuration and Node scripts in TypeScript (`.ts`, `.tsx`, `.mts`). Do not introduce `.js` or `.mjs` source files. Dependencies and generated bundles are outside this rule.
- Maintain German and English UI together. Keep original expressions unchanged. Use canonical quiz category IDs and separately stored DE/EN explanations. Cloudflare Workers AI suggestions use the server AI binding, signed-in access, rate limits and a review before publication; never translate during game polling.
- All eleven modes are playable. The three cooperative modes require 2–10 players. Quotes and False Friends allow 1–10; the sentence builder does too. Quizzes allow 1–10 players, bluff rooms require 3–10, tongue twisters require 2–10 for peer ratings. Tongue twisters use live speech in the same room or voice chat; scores are provided by the other players.
- Correct answers award one point in quizzes and the bluff game; a successful bluff adds one point per fooled player. Tongue-twister peer ratings remain 1–5.
- Preserve database-enforced contribution uniqueness from migration 006, including concurrent requests. Match kind, original language and normalized phrase, plus region for dialects or context for situations. Direct contributors to existing entries for additional explanations.
- Round count is host-configurable from 1 to twice the joined player count, also limited by available unique prompts. Preserve same-room rematches, confirmed leave, earliest-remaining-player host transfer and reconciliation of unfinished turns.
- Keep the IANA language allowlist and search registry synchronized. Optional credit names never override account identity. Audio is opt-in, max 20 seconds, server-validated canonical WAV in the private AUDIO R2 binding; only attached clips are public.
- Keep author identity and permissions on the server. Use the managed Neon Auth SDK for email/password authentication.
- Keep SQL migrations under `db/migrations/`. Run the tracked migration runner; never put credentials in source.
- Keep answers, author assignments and future cards out of room responses until their reveal phase. Preserve optimistic concurrency checks.
- Validate with `npm run typecheck`, `npm test` and `npm run build`. Use `npm run test:integration` with `.env.test.local` and a configured isolated test database and running server when changing auth, persistence or the game API.

- Zungenbrecher has the Zungenknoten and Klangfallen categories; both repeat a supplied sentence and use peer ratings. Quote rooms distinguish person quotes from song titles. Word building accepts only stored sequences and randomizes public tile IDs per round. Cooperative tasks keep their source briefing and targets private to the caller until reveal.

- Contributions explicitly select `presentation` as text, audio or both. Audio-only entries have an empty phrase and require owned audio with a server-computed hash. Preserve partial text uniqueness and the audio-content identity index. Do not collapse empty audio transcripts into one game prompt or disclose unselected media in room projections. Legacy rounds without presentation infer both when audioId exists.

- Public attribution uses only explicit credit names; never fall back to account names, including explanations and game reveals. Keep internal author metadata available only to administration.
- New contributions require a literal translation and accept an optional explanation. Keep legacy stored cards valid, use translation as the bluff fallback, and withhold it before voting/reveal. Discovery starts closed and lists answer-free previews only.
- All administration endpoints must check the managed session and `app_admins` on the server. Keep grants tied to an existing immutable account ID. Preserve ownership, revision checks, uniqueness, moderation audit and recoverable removals. Never expose credentials/session tokens in user lists or grant synthetic test accounts access without explicit authorization.
