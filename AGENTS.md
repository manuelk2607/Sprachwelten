# Sprachwelten

Sprachwelten is a separate application. Do not copy or alter code from sibling projects.

- Write all owned application code, configuration and Node scripts in TypeScript (`.ts`, `.tsx`, `.mts`). Do not introduce `.js` or `.mjs` source files. Dependencies and generated bundles are outside this rule.
- Maintain German and English UI together. Keep original expressions unchanged. Use canonical quiz category IDs and separately stored DE/EN explanations. DeepL suggestions require signed-in access, a server secret, rate limits and a review before publication; never translate during game polling.
- All five modes are playable. Quizzes allow 1–10 players, bluff rooms require 3–10, tongue twisters require 2–10 for peer ratings. Tongue twisters use live speech in the same room or voice chat; scores are provided by the other players.
- Keep author identity and permissions on the server. Use the managed Neon Auth SDK for email/password authentication.
- Keep SQL migrations under `db/migrations/`. Run the tracked migration runner; never put credentials in source.
- Keep answers, author assignments and future cards out of room responses until their reveal phase. Preserve optimistic concurrency checks.
- Validate with `npm run typecheck`, `npm test` and `npm run build`. Use `npm run test:integration` with a configured test database and running server when changing auth, persistence or the game API.
