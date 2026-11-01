import { test, expect } from "@playwright/test";
import { act, createGame, viewGame } from "../../lib/game";
import { entryInput, type Entry, type RoomAction } from "../../lib/content";

const songs = (): Entry[] =>
  [0, 1, 2].map((n) => ({
    ...entryInput.parse({
      kind: "attribution",
      phrase: "Eine erfundene Liedstelle " + n,
      language: "de",
      hint: "Ein kleiner Hinweis " + n,
      challenge: {
        type: "attribution",
        category: "song",
        answer: "Lied " + n,
        artist: "Interpret " + n,
        album: "Album " + n,
        alternatives: ["Falsches Lied A", "Falsches Lied B", "Falsches Lied C"],
      },
    }),
    id: crypto.randomUUID(),
    status: "community",
    createdAt: new Date().toISOString(),
    authorName: "",
  }));

test("song hints precede albums, survive polling and reset on the next round", async ({
  page,
}) => {
  const entries = songs(),
    host = {
      id: crypto.randomUUID(),
      name: "QA",
      tokenHash: "fixture",
      score: 0,
    },
    game = createGame("SONGXX", host, "de", "who-said-it");
  game.totalRounds = 2;
  act(game, host.id, { action: "start" }, entries);
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:SONGXX", "fixture"),
  );
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/rooms/SONGXX", (route) => {
    if (route.request().method() === "POST")
      act(game, host.id, route.request().postDataJSON() as RoomAction, entries);
    return route.fulfill({ json: { room: viewGame(game, host.id) } });
  });
  await page.goto("/room/SONGXX");
  const hint = game.round!.entry.hint!,
    album = viewGame(game, host.id).songHelp!.album;
  await expect(page.getByText(hint, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Album anzeigen", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tipp anzeigen", exact: true })
    .click();
  await expect(page.getByText(hint, { exact: true })).toBeVisible();
  await expect(page.getByText(album, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Album anzeigen", exact: true })
    .click();
  await expect(page.getByText(album, { exact: false })).toBeVisible();
  await expect
    .poll(async () =>
      page
        .getByRole("button", { name: "Album ausblenden", exact: true })
        .getAttribute("aria-expanded"),
    )
    .toBe("true");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hide album", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide hint", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show album", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Show hint", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show album", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  const right = game.round!.options.find((o) => o.solution)!.id,
    index = viewGame(game, host.id).options.findIndex((o) => o.id === right);
  await page.locator(".options .option").nth(index).click();
  expect(game.players[0].score).toBe(1);
  await expect(
    page.getByRole("button", { name: "Show album", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next round", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show hint", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Show album", exact: true }),
  ).toHaveCount(0);
});

test("songs without custom hints offer the artist first and album-only songs remain usable", async ({
  page,
}) => {
  const entries = songs().map((e) => ({ ...e, hint: "" })),
    host = {
      id: crypto.randomUUID(),
      name: "QA",
      tokenHash: "fixture",
      score: 0,
    },
    game = createGame("SONGXY", host, "de", "who-said-it");
  act(game, host.id, { action: "start" }, entries);
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:SONGXY", "fixture"),
  );
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/rooms/SONGXY", (route) =>
    route.fulfill({ json: { room: viewGame(game, host.id) } }),
  );
  await page.goto("/room/SONGXY");
  const artist = viewGame(game, host.id).songHelp!.artist;
  await expect(page.getByText(artist, { exact: false })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tipp anzeigen", exact: true })
    .click();
  await expect(page.getByText(artist, { exact: false })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Album anzeigen", exact: true }),
  ).toBeVisible();
  const challenge = game.round!.entry.challenge;
  if (challenge?.type === "attribution") challenge.artist = "";
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tipp anzeigen", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Album anzeigen", exact: true }),
  ).toBeVisible();
});

test("song contributions save optional albums and reviewed bilingual hints", async ({
  page,
}) => {
  let saved: ReturnType<typeof entryInput.parse> | undefined;
  for (const [path, json] of [
    ["**/api/auth/get-session**", null],
    ["**/api/audio", { available: false }],
    ["**/api/translations", { available: false }],
    ["**/api/regions", { regions: {} }],
    ["**/api/entries/duplicates?*", { duplicate: null }],
  ] as const)
    await page.route(path, (route) => route.fulfill({ json }));
  await page.route("**/api/entries", (route) => {
    saved = entryInput.parse(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      json: {
        entry: { ...saved, id: crypto.randomUUID(), status: "community" },
      },
    });
  });
  const ready = page.waitForResponse((r) =>
    r.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").first().click();
  await page
    .getByRole("option", { name: "Zitat oder Liedstelle", exact: true })
    .click();
  await expect(dialog.locator('[name="hint"]')).toHaveCount(0);
  await dialog
    .getByRole("combobox", { name: "Kategorie", exact: true })
    .click();
  await page.getByRole("option", { name: "Liedstelle", exact: true }).click();
  await dialog.locator('[name="phrase"]').fill("Eine erfundene Liedstelle");
  await dialog.locator('[name="challenge.answer"]').fill("Testlied");
  await dialog.locator('[name="challenge.artist"]').fill("Testinterpret");
  await dialog.locator('[name="challenge.album"]').fill("Testalbum");
  await dialog.locator('[name="hint"]').fill("Ein Lied über Fernweh.");
  await dialog.locator('.inline-hint-translation summary').click();
  await dialog
    .getByLabel("Tipp fürs Spiel · Englisch", { exact: true })
    .fill("A song about wanderlust.");
  await dialog
    .getByLabel("Ich habe die zweite Sprachfassung geprüft.", { exact: true })
    .check();
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect.poll(() => saved?.hint).toBe("Ein Lied über Fernweh.");
  expect(saved?.translation?.hint).toBe("A song about wanderlust.");
  expect(
    saved?.challenge?.type === "attribution" && saved.challenge.album,
  ).toBe("Testalbum");
});
