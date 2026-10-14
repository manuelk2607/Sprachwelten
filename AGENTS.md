# Sprachwelten

Sprachwelten is a separate application. Do not copy or alter code from sibling projects.

Primary production is the owner’s Cloudflare Worker `sprachwelten`: https://sprachwelten.manuelk2607.workers.dev. Publish updates with `npm run deploy:cloudflare` after building. The `.openai/hosting.json` ID refers to the earlier, separate Sites publication; do not deploy there unless the user asks. Preserve existing server secrets and the current Neon database/auth project.

- Write all owned application code, configuration and Node scripts in TypeScript (`.ts`, `.tsx`, `.mts`). Do not introduce `.js` or `.mjs` source files. Dependencies and generated bundles are outside this rule.
- Maintain German and English UI together. Keep original expressions unchanged. Use canonical quiz category IDs and separately stored DE/EN explanations. Cloudflare Workers AI suggestions use the server AI binding, signed-in access, rate limits and a review before publication; never translate during game polling.
- All five modes are playable. Quizzes allow 1–10 players, bluff rooms require 3–10, tongue twisters require 2–10 for peer ratings. Tongue twisters use live speech in the same room or voice chat; scores are provided by the other players.
- Correct answers award one point in quizzes and the bluff game; a successful bluff adds one point per fooled player. Tongue-twister peer ratings remain 1–5.
- Keep author identity and permissions on the server. Use the managed Neon Auth SDK for email/password authentication.
- Keep SQL migrations under `db/migrations/`. Run the tracked migration runner; never put credentials in source.
- Keep answers, author assignments and future cards out of room responses until their reveal phase. Preserve optimistic concurrency checks.
- Validate with `npm run typecheck`, `npm test` and `npm run build`. Use `npm run test:integration` with a configured test database and running server when changing auth, persistence or the game API.
