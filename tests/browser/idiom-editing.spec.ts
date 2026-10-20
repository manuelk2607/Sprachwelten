import { test, expect } from "@playwright/test";
import { act, createGame, viewGame } from "../../lib/game";
import { seedEntries } from "../../lib/seeds";
import { phraseInput } from "../../lib/phrase-markup";
import type { RoomAction, Entry } from "../../lib/content";
import { entryPreview } from "../../lib/content-public";
import { entryInput } from "../../lib/content";

test("new idioms submit canonical text and show bold words and translated hints in discovery", async ({
  page,
}) => {
  const entry: Entry = {
    ...seedEntries[0],
    ...phraseInput("Den **Nagel** auf den Kopf treffen", "idiom"),
    hint: "Ein Werkzeug.",
    sourceLocale: "de",
    translations: { en: { hint: "A tool.", origin: "contributor" } },
  };
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/audio", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/translations", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/regions", (route) =>
    route.fulfill({ json: { regions: {} } }),
  );
  let lookup = "",
    saved: ReturnType<typeof entryInput.parse> | undefined;
  await page.route("**/api/entries/duplicates?*", (route) => {
    lookup = new URL(route.request().url()).searchParams.get("phrase") ?? "";
    return route.fulfill({ json: { duplicate: null } });
  });
  await page.route("**/api/entries", (route) => {
    saved = entryInput.parse(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { entry } });
  });
  await page.route("**/api/entries?*", (route) =>
    route.fulfill({ json: { entries: [entryPreview(entry)], more: false } }),
  );
  await page.route("**/api/entries/" + entry.id, (route) =>
    route.fulfill({
      json: { entry, explanations: [], canEdit: false, canSuggest: false },
    }),
  );
  const ready = page.waitForResponse((response) =>
    response.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.locator('[name="phrase"]').fill(entry.phraseMarkup!);
  await dialog.locator('[name="hint"]').fill(entry.hint!);
  for (let index = 0; index < 4; index++)
    await dialog
      .locator('[name="challenge.choices.' + index + '.de"]')
      .fill("Bedeutung " + index);
  await expect.poll(() => lookup).toBe(entry.phrase);
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect.poll(() => saved?.phrase).toBe(entry.phrase);
  expect(saved?.phraseMarkup).toBe(entry.phraseMarkup);
  await page
    .getByRole("button", { name: "Sammlung öffnen", exact: true })
    .click();
  await expect(page.locator(".entry-card h3 strong")).toHaveText("Nagel");
  await page.locator(".entry-card").click();
  dialog = page.getByRole("dialog");
  await expect(dialog.locator("h2 strong")).toHaveText("Nagel");
  await expect(
    dialog.getByText("Ein Werkzeug.", { exact: false }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.locator(".entry-card").click();
  await expect(
    page.getByRole("dialog").getByText("A tool.", { exact: false }),
  ).toBeVisible();
});

test("idiom hints and highlighted words survive editing and keep the submitted original plain", async ({
  page,
}) => {
  const entry: Entry = {
    ...seedEntries[0],
    ...phraseInput("Da liegt der **Hund** begraben.", "idiom"),
    hint: "Denke an ein Tier.",
    literal: "Here lies the dog buried.",
    sourceLocale: "de",
    translations: {
      en: { hint: "Think of an animal.", origin: "contributor" },
    },
  };
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "qa",
          userId: "qa",
          expiresAt: "2099-01-01",
          token: "fixture",
        },
        user: {
          id: "qa",
          name: "QA",
          email: "qa@sprachwelten.invalid",
          emailVerified: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      },
    }),
  );
  await page.route("**/api/admin/access", (route) =>
    route.fulfill({ json: { isAdmin: false } }),
  );
  await page.route("**/api/audio", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/translations", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/regions", (route) =>
    route.fulfill({ json: { regions: {} } }),
  );
  await page.route("**/api/entries/duplicates?*", (route) => {
    return route.fulfill({ json: { duplicate: null } });
  });
  await page.route("**/api/me/entries?*", (route) =>
    route.fulfill({ json: { entries: [entry], more: false } }),
  );
  let saved: Entry | undefined;
  await page.route("**/api/me/entries/" + entry.id, (route) => {
    saved = route.request().postDataJSON() as Entry;
    return route.fulfill({ json: { entry: saved } });
  });
  await page.goto("/me");
  await expect(page.locator(".admin-entries h2 strong")).toHaveText("Hund");
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('[name="phrase"]')).toHaveValue(
    "Da liegt der **Hund** begraben.",
  );
  await expect(dialog.locator('[name="hint"]')).toHaveValue(
    "Denke an ein Tier.",
  );
  await dialog
    .locator('[name="phrase"]')
    .fill("Da liegt der Hund **begraben**.");
  await expect(dialog.locator(".phrase-preview strong")).toHaveText("begraben");
  await dialog.locator('[name="hint"]').fill("Ein Hinweis auf die Ursache.");
  await dialog
    .getByLabel("Tipp fürs Spiel · Englisch", { exact: true })
    .fill("A clue to the cause.");
  await dialog
    .getByLabel("Ich habe die zweite Sprachfassung geprüft.", { exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect.poll(() => saved?.phrase).toBe("Da liegt der Hund begraben.");
  expect(saved?.phraseMarkup).toBe("Da liegt der Hund **begraben**.");
  expect(saved?.hint).toBe("Ein Hinweis auf die Ursache.");
});

test("the current idiom displays bold words and an opt-in hint that resets on the next round", async ({
  page,
}) => {
  const host = {
    id: crypto.randomUUID(),
    name: "QA",
    tokenHash: "fixture",
    score: 0,
  };
  const entries = seedEntries.map((entry, n) => ({
    ...entry,
    ...phraseInput("Ein **Ausdruck** Nummer " + n, "idiom"),
    hint: "Hinweis Nummer " + n + ".",
  }));
  const game = createGame("IDIOMX", host, "de", "meaning-quiz");
  game.totalRounds = 2;
  act(game, host.id, { action: "start" }, entries);
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:IDIOMX", "qa"),
  );
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/rooms/IDIOMX", (route) => {
    if (route.request().method() === "POST")
      act(game, host.id, route.request().postDataJSON() as RoomAction, entries);
    return route.fulfill({ json: { room: viewGame(game, host.id) } });
  });
  await page.goto("/room/IDIOMX");
  await expect(page.locator("h1 strong")).toHaveText("Ausdruck");
  const hint = game.round!.entry.hint!;
  await expect(page.getByText(hint, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tipp anzeigen", exact: true })
    .click();
  await expect(page.getByText(hint, { exact: true })).toBeVisible();
  const right = game.round!.options.find((option) => option.solution)!;
  await page
    .locator(".options .option")
    .nth(
      viewGame(game, host.id).options.findIndex(
        (option) => option.id === right.id,
      ),
    )
    .click();
  await expect(
    page.getByRole("button", { name: "Tipp ausblenden", exact: true }),
  ).toHaveCount(0);
  expect(game.players[0].score).toBe(1);
  await page
    .getByRole("button", { name: "Nächste Runde", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tipp anzeigen", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(game.round!.entry.hint!, { exact: true }),
  ).toHaveCount(0);
});
