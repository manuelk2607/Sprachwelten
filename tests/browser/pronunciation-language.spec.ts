import { test, expect } from "@playwright/test";
import { act, createGame, joinGame, viewGame } from "../../lib/game";
import { updateAvailability } from "../../lib/game-pool";
import type { RoomAction } from "../../lib/content";
import { extraSeeds } from "../../lib/extra-seeds";
import { newGameEntries } from "../../lib/new-game-seeds";
const player = () => ({
  id: crypto.randomUUID(),
  name: "QA Speech",
  tokenHash: "qa-only",
  score: 0,
});
const twister = extraSeeds.find((entry) => entry.kind === "tongue_twister")!,
  sound = newGameEntries.find((entry) => entry.kind === "sound_pair")!;
const entries = ["de", "fr"].flatMap((language) =>
  [0, 1, 2].map((index) => ({
    ...(index === 2 ? sound : twister),
    id: crypto.randomUUID(),
    language,
    phrase: `${language} pronunciation ${index}`,
  })),
);
test.beforeEach(async ({ page }) => {
  await page.route("**/api/rooms/languages?*", (route) =>
    route.fulfill({
      json: {
        languages: [
          { code: "de", count: 3 },
          { code: "fr", count: 3 },
        ],
      },
    }),
  );
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
});
test("hosts filter text and audio categories through centrally synchronized language checkboxes", async ({
  page,
}) => {
  const host = player(),
    game = createGame("SPRACH", host, "de", "tongue-twisters");
  joinGame(game, { ...player(), id: crypto.randomUUID(), name: "QA Listener" });
  updateAvailability(game, entries);
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:SPRACH", "qa-only"),
  );
  await page.route("**/api/rooms/SPRACH", (route) => {
    if (route.request().method() === "POST")
      act(game, host.id, route.request().postDataJSON() as RoomAction, entries);
    return route.fulfill({ json: { room: viewGame(game, host.id) } });
  });
  await page.goto("/room/SPRACH");
  await expect(
    page.getByRole("checkbox", { name: "Deutsch (3)", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Französisch (3)", exact: true })
    .check();
  await expect.poll(() => game.gameLanguages).toEqual(["de", "fr"]);
  await page
    .getByRole("checkbox", { name: "Deutsch (3)", exact: true })
    .uncheck();
  await expect.poll(() => game.gameLanguages).toEqual(["fr"]);
  await page.getByRole("combobox", { name: "Kategorie", exact: true }).click();
  await page.getByRole("option", { name: "Klangfallen", exact: true }).click();
  await expect.poll(() => game.availableRounds).toBe(1);
  await page
    .getByRole("searchbox", { name: "Sprachen suchen", exact: true })
    .fill("Deutsch");
  await expect(page.getByRole("checkbox")).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Deutsch (3)", exact: true })
    .check();
  await expect.poll(() => game.gameLanguages).toEqual(["fr", "de"]);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search languages", exact: true })
    .fill("");
  await page
    .getByRole("checkbox", { name: "French (3)", exact: true })
    .uncheck();
  await expect.poll(() => game.gameLanguages).toEqual(["de"]);
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await expect(page.locator(".round-header")).toBeVisible();
  expect(
    game.prompts.every(
      (entry) => entry.language === "de" && entry.kind === "sound_pair",
    ),
  ).toBeTruthy();
});
test("new pronunciation rooms default to the UI language and persist explicit multiple-language settings", async ({
  page,
}) => {
  const ready = page.waitForResponse((response) =>
    response.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  await page
    .locator(".quick-start")
    .getByRole("combobox", { name: "Spielmodus", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Zungenbrecher", exact: true })
    .click();
  await page
    .locator(".quick-start")
    .getByRole("button", { name: "Raum erstellen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("checkbox", { name: "Deutsch (3)", exact: true }),
  ).toBeChecked();
  await dialog
    .getByRole("checkbox", { name: "Französisch (3)", exact: true })
    .check();
  await dialog
    .getByRole("checkbox", { name: "Deutsch (3)", exact: true })
    .uncheck();
  await dialog
    .getByRole("textbox", { name: "Dein Spielname", exact: true })
    .fill("QA Speech");
  let selected: unknown;
  await page.route("**/api/rooms", (route) => {
    selected = route.request().postDataJSON().gameLanguages;
    return route.fulfill({
      status: 422,
      json: { error: "QA stopped before creating a real room." },
    });
  });
  await dialog
    .locator("form")
    .getByRole("button", { name: "Raum erstellen", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(selected).toEqual(["fr"]);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sprachwelten-game-languages:tongue-twisters"),
    ),
  ).toBe('["fr"]');
});

test('game difficulty is hidden without approval coverage and scoped to the selected languages',async({page})=>{
 await page.route('**/api/rooms/languages?*',route=>route.fulfill({json:{languages:[{code:'de',count:40,reviewedCount:40},{code:'fr',count:40,reviewedCount:0}]}}));
 await page.route('**/api/rooms/difficulties?*',route=>{
  const languages=new URL(route.request().url()).searchParams.get('languages');
  return route.fulfill({json:{levels:languages==='de'?['introductory']:[]}});
 });
 const ready=page.waitForResponse(r=>r.url().includes('/api/auth/get-session'));await page.goto('/');await ready;
 await page.locator('.quick-start').getByRole('button',{name:'Raum erstellen',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('checkbox',{name:'Französisch (40)',exact:true})).toBeChecked();
 await expect(dialog.getByRole('combobox',{name:'Spielstufe',exact:true})).toHaveCount(0);
 await dialog.getByRole('checkbox',{name:'Französisch (40)',exact:true}).uncheck();
 await dialog.getByRole('combobox',{name:'Spielstufe',exact:true}).click();
 await page.getByRole('option',{name:'Einstieg',exact:true}).click();
 await dialog.getByRole('textbox',{name:'Dein Spielname',exact:true}).fill('QA difficulty');
 const sent:Record<string,unknown>[]=[];
 await page.route('**/api/rooms',route=>{sent.push(route.request().postDataJSON());return route.fulfill({status:422,json:{error:'QA stopped before creating a real room.'}});});
 await dialog.locator('form').getByRole('button',{name:'Raum erstellen',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(1);expect(sent[0].difficulty).toBe('introductory');
 await dialog.getByRole('checkbox',{name:'Französisch (40)',exact:true}).check();
 await expect(dialog.getByRole('combobox',{name:'Spielstufe',exact:true})).toHaveCount(0);
 await dialog.locator('form').getByRole('button',{name:'Raum erstellen',exact:true}).click();
 await expect.poll(()=>sent.length).toBe(2);expect(sent[1].difficulty).toBeUndefined();
});
