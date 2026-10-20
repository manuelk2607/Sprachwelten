import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parsePhraseMarkup, phraseInput } from "../lib/phrase-markup";
import { PhraseText } from "../components/phrase-text";
import { entryInput, storedEntryInput } from "../lib/content";
import { entryPreview } from "../lib/content-public";
import { seedEntries } from "../lib/seeds";
import { act, createGame, viewGame } from "../lib/game";

test("paired bold markers preserve the canonical original and render only escaped text", () => {
  const input = phraseInput("  Da liegt der **Hund** **begraben**.  ", "idiom");
  assert.equal(input.phrase, "Da liegt der Hund begraben.");
  assert.equal(
    renderToStaticMarkup(
      createElement(PhraseText, { entry: { ...input, kind: "idiom" } }),
    ),
    "Da liegt der <strong>Hund</strong> <strong>begraben</strong>.",
  );
  const html = phraseInput(
    "**<img src=x onerror=alert(1)>** & <script>",
    "idiom",
  );
  assert.equal(
    renderToStaticMarkup(createElement(PhraseText, { entry: html })),
    "<strong>&lt;img src=x onerror=alert(1)&gt;</strong> &amp; &lt;script&gt;",
  );
  assert.equal(
    parsePhraseMarkup("**unvollständig und *einzeln*").plain,
    "**unvollständig und *einzeln*",
  );
  assert.equal(phraseInput("**Äpfel und Öl**", "idiom").phrase, "Äpfel und Öl");
  assert.deepEqual(phraseInput("**Wörtlich**", "word"), {
    phrase: "**Wörtlich**",
    phraseMarkup: "",
  });
  assert.equal(
    renderToStaticMarkup(
      createElement(PhraseText, {
        entry: { ...input, phrase: "Anderer Text" },
      }),
    ),
    "Anderer Text",
  );
});

test("formatting metadata cannot change identity, bypass length limits or disclose hidden audio text", () => {
  const base = {
    kind: "idiom",
    language: "de",
    literal: "Literal translation",
    ...phraseInput("Ein **besonderer** Ausdruck", "idiom"),
  };
  assert.equal(entryInput.parse(base).phrase, "Ein besonderer Ausdruck");
  assert.equal(
    entryInput.safeParse({ ...base, phraseMarkup: "**Andere Bedeutung**" })
      .success,
    false,
  );
  assert.equal(
    entryInput.safeParse({ ...base, phraseMarkup: "Ein besonderer Ausdruck" })
      .success,
    false,
  );
  assert.equal(
    entryInput.safeParse({
      ...base,
      ...phraseInput("**" + "a".repeat(181) + "**", "idiom"),
    }).success,
    false,
  );
  assert.equal(
    entryInput.safeParse({
      ...base,
      presentation: "audio",
      audioId: crypto.randomUUID(),
    }).success,
    false,
  );
  assert.equal(
    storedEntryInput.parse({ ...base, literal: "" }).phraseMarkup,
    base.phraseMarkup,
  );
  assert.equal(
    storedEntryInput.parse({
      kind: "idiom",
      language: "de",
      phrase: "**Alter Ausdruck**",
    }).phrase,
    "**Alter Ausdruck**",
  );
});

test("current idiom formatting is public without answers or future-card metadata", () => {
  const entries = seedEntries.map((entry, index) => ({
    ...entry,
    ...phraseInput("**Ausdruck** Nummer " + index, "idiom"),
    hint: "Tipp " + index,
  }));
  const host = {
    id: crypto.randomUUID(),
    name: "QA",
    score: 0,
    tokenHash: "qa",
  };
  const game = createGame("BOLDXX", host, "de", "meaning-quiz");
  act(game, host.id, { action: "start" }, entries);
  const view = viewGame(game, host.id);
  assert.equal(view.prompt?.phraseMarkup, game.round!.entry.phraseMarkup);
  assert.equal(view.revelation, null);
  assert.ok(
    !JSON.stringify(view).includes(
      JSON.stringify(game.prompts[1].phraseMarkup!),
    ),
  );
  const preview = entryPreview(entries[0]);
  assert.equal(preview.phraseMarkup, entries[0].phraseMarkup);
  assert.ok(!("hint" in preview));
  assert.ok(!("meaning" in preview));
  game.round!.entry.presentation = "audio";
  game.round!.entry.audioId = crypto.randomUUID();
  assert.equal(viewGame(game, host.id).prompt?.phrase, "");
  assert.equal(viewGame(game, host.id).prompt?.phraseMarkup, undefined);
});
