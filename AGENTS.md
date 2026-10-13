# Sprachwelten

Sprachwelten is a separate application. Do not copy or alter code from sibling projects.

- Write all owned application code, configuration and Node scripts in TypeScript (`.ts`, `.tsx`, `.mts`). Do not introduce `.js` or `.mjs` source files. Dependencies and generated bundles are outside this rule.
- Maintain German and English UI together. Use `lib/i18n.tsx` and `lib/translations.ts`; do not translate user submissions automatically.
- Keep “Was soll das heißen?” / “What does that mean?” as the first playable mode. The language quiz, tongue twisters, dialect game and everyday-language game are prepared but marked “Bald verfügbar” / “Coming soon”.
- Keep author identity and permissions on the server. Use the managed Neon Auth SDK for email/password authentication.
- Keep SQL migrations under `db/migrations/`. Run the tracked migration runner; never put credentials in source.
- Keep answers, author assignments and future cards out of room responses until their reveal phase. Preserve optimistic concurrency checks.
- Validate with `npm run typecheck`, `npm test` and `npm run build`. Use `npm run test:integration` with a configured test database and running server when changing auth, persistence or the game API.
