import { test, expect, type Page } from "@playwright/test";
import { entryInput } from "../../lib/content";

test("translation errors and oversized suggestions preserve existing answers and allow correction", async ({
  page,
}) => {
  const { dialog } = await editor(page);
  let calls = 0;
  await page.route("**/api/translations", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    calls++;
    return route.fulfill(
      calls === 1
        ? {
            status: 503,
            json: {
              error:
                "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
            },
          }
        : { json: { translation: { meaning: "a".repeat(301) } } },
    );
  });
  const field = dialog.locator(".bilingual-field").first();
  await field.locator("input").first().fill("Ein Ausgangstext");
  await field.locator("summary").click();
  await field.locator("input").nth(1).fill("Existing target");
  await field.getByRole("button", { name: /^Englisch vorschlagen ·/ }).click();
  await expect(field.getByRole("alert")).toHaveText(
    "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
  );
  await expect(field.locator("input").nth(1)).toHaveValue("Existing target");
  await field.getByRole("button", { name: /^Englisch vorschlagen ·/ }).click();
  await expect(
    field.getByRole("button", { name: "Vorschlag übernehmen", exact: true }),
  ).toBeDisabled();
  await expect(field.getByRole("alert")).toHaveText(
    "Bitte kürze den Vorschlag auf höchstens 300 Zeichen.",
  );
  await field
    .locator(".answer-translation-preview textarea")
    .fill("Short reviewed translation");
  await field
    .getByRole("button", { name: "Vorschlag übernehmen", exact: true })
    .click();
  await expect(field.locator("input").nth(1)).toHaveValue(
    "Short reviewed translation",
  );
});

async function editor(page: Page, guest = false, available = true) {
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: guest
        ? null
        : {
            session: {
              id: "qa-session",
              userId: "qa-user",
              expiresAt: "2099-01-01T00:00:00Z",
              token: "fixture-only",
            },
            user: {
              id: "qa-user",
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
  await page.route("**/api/regions", (route) =>
    route.fulfill({ json: { regions: {} } }),
  );
  await page.route("**/api/entries/duplicates?*", (route) =>
    route.fulfill({ json: { duplicate: null } }),
  );
  const requests: { sourceLocale: string; texts: { meaning: string } }[] = [];
  await page.route("**/api/translations", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available } });
    const data = route.request().postDataJSON() as (typeof requests)[number];
    requests.push(data);
    return route.fulfill({
      json: {
        translation: {
          meaning:
            data.sourceLocale === "de"
              ? "Suggested English answer"
              : "Vorgeschlagene deutsche Antwort",
        },
      },
    });
  });
  const ready = page.waitForResponse((response) =>
    response.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  if (!guest)
    await expect(
      page.getByRole("link", { name: "Meine Beiträge", exact: true }),
    ).toBeVisible();
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  return { dialog: page.getByRole("dialog"), requests };
}

test("answer suggestions work in both directions and require review before replacing existing text", async ({
  page,
}) => {
  const { dialog, requests } = await editor(page);
  const field = dialog.locator(".bilingual-field").first();
  await field
    .locator('[name="challenge.choices.0.de"]')
    .fill("Eine richtige Bedeutung");
  await field.locator("summary").click();
  await field
    .locator('[name="challenge.choices.0.en"]')
    .fill("Existing English meaning");
  await field
    .getByRole("button", {
      name: "Englisch vorschlagen · Richtige Antwort",
      exact: true,
    })
    .click();
  await expect(
    field.getByLabel("Übersetzungsvorschlag · Richtige Antwort", {
      exact: true,
    }),
  ).toHaveValue("Suggested English answer");
  await expect(field.locator('[name="challenge.choices.0.en"]')).toHaveValue(
    "Existing English meaning",
  );
  await field
    .getByLabel("Übersetzungsvorschlag · Richtige Antwort", { exact: true })
    .fill("Reviewed English meaning");
  await field
    .getByRole("button", { name: "Vorschlag übernehmen", exact: true })
    .click();
  await expect(field.locator('[name="challenge.choices.0.en"]')).toHaveValue(
    "Reviewed English meaning",
  );
  await field
    .getByRole("button", {
      name: "Deutsch vorschlagen · Richtige Antwort",
      exact: true,
    })
    .click();
  await field
    .getByRole("button", { name: "Vorschlag übernehmen", exact: true })
    .click();
  await expect(field.locator('[name="challenge.choices.0.de"]')).toHaveValue(
    "Vorgeschlagene deutsche Antwort",
  );
  expect(requests).toEqual([
    { sourceLocale: "de", texts: { meaning: "Eine richtige Bedeutung" } },
    { sourceLocale: "en", texts: { meaning: "Reviewed English meaning" } },
  ]);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .locator(".header")
    .getByRole("button", { name: "Contribute", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", {
      name: "Suggest German · Correct answer",
      exact: true,
    }),
  ).toBeVisible();
});

test("dialect, joke and other bilingual answer editors share translation suggestions", async ({
  page,
}) => {
  const { dialog, requests } = await editor(page);
  for (const kind of [
    "Dialekt",
    "Witz & Pointe",
    "Wortverwandtschaft",
    "Klangfallen",
    "False Friends?",
  ]) {
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: kind, exact: true }).click();
    if (kind === "Dialekt")
      await dialog
        .getByLabel(
          "Eigene Antwortmöglichkeiten für das Bedeutungsquiz eintragen",
          { exact: true },
        )
        .check();
    const field = dialog.locator(".bilingual-field").first();
    await field.locator("input").first().fill("Ein deutscher Antworttext");
    await field
      .getByRole("button", { name: /^Englisch vorschlagen ·/ })
      .click();
    await expect(
      field.locator(".answer-translation-preview textarea"),
    ).toHaveValue("Suggested English answer");
    await field
      .getByRole("button", { name: "Vorschlag übernehmen", exact: true })
      .click();
    await expect(field.locator("input").nth(1)).toHaveValue(
      "Suggested English answer",
    );
  }
  expect(requests).toHaveLength(5);
});

test("late and outdated suggestions cannot overwrite newer source or target edits", async ({
  page,
}) => {
  const { dialog } = await editor(page);
  let finish: (() => void) | undefined;
  await page.route("**/api/translations", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true } });
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    await route.fulfill({
      json: { translation: { meaning: "Old suggestion" } },
    });
  });
  const field = dialog.locator(".bilingual-field").first();
  await field.locator("input").first().fill("Alter Ausgangstext");
  await field.getByRole("button", { name: /^Englisch vorschlagen ·/ }).click();
  await expect.poll(() => !!finish).toBe(true);
  await field.locator("input").first().fill("Neuer Ausgangstext");
  finish!();
  await expect(field.getByRole("alert")).toHaveText(
    "Die Antwort wurde inzwischen geändert. Bitte die Übersetzung erneut vorschlagen lassen.",
  );
  await expect(field.locator(".answer-translation-preview")).toHaveCount(0);
  await page.unroute("**/api/translations");
  await page.route("**/api/translations", (route) =>
    route.fulfill({ json: { translation: { meaning: "New suggestion" } } }),
  );
  await field.getByRole("button", { name: /^Englisch vorschlagen ·/ }).click();
  await expect(field.locator(".answer-translation-preview")).toBeVisible();
  await field.locator("summary").click();
  await field.locator("input").nth(1).fill("Manually revised target");
  await expect(field.locator(".answer-translation-preview")).toHaveCount(0);
  await expect(field.locator("input").nth(1)).toHaveValue(
    "Manually revised target",
  );
});

test("unavailable services and guests keep manual answers editable while suggestions stay disabled", async ({
  page,
}) => {
  const { dialog, requests } = await editor(page, true, false);
  const field = dialog.locator(".bilingual-field").first();
  await field.locator("input").first().fill("Manuelle Antwort");
  await expect(
    field.getByRole("button", { name: /^Englisch vorschlagen ·/ }),
  ).toBeDisabled();
  await field.locator("summary").click();
  await field.locator("input").nth(1).fill("Manual answer");
  expect(requests).toHaveLength(0);
});

test("editing legacy choices preserves the correct index when accepting an answer translation", async ({
  page,
}) => {
  await editor(page);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  const entry = {
    ...entryInput.parse({
      kind: "dialect",
      language: "de",
      regionId: "ch",
      phrase: "QA Dialekt",
      challenge: {
        type: "meaning",
        choices: [0, 1, 2, 3].map((n) => ({
          de: "Antwort " + n,
          en: "Answer " + n,
        })),
        correctIndex: 2,
      },
    }),
    id: crypto.randomUUID(),
    status: "community",
    authorName: "",
    createdAt: "2026-01-01",
    revision: 0,
  };
  let saved: typeof entry | undefined;
  await page.route("**/api/me/entries?*", (route) =>
    route.fulfill({ json: { entries: [entry], more: false } }),
  );
  await page.route("**/api/me/entries/" + entry.id, (route) => {
    saved = route.request().postDataJSON() as typeof entry;
    return route.fulfill({ json: { entry } });
  });
  await page.goto("/me");
  await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const field = dialog.locator(".bilingual-field").first();
  await expect(field.locator("input").first()).toHaveValue("Antwort 2");
  await field.getByRole("button", { name: /^Englisch vorschlagen ·/ }).click();
  await field
    .getByRole("button", { name: "Vorschlag übernehmen", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Änderungen speichern", exact: true })
    .click();
  await expect
    .poll(
      () =>
        saved?.challenge?.type === "meaning" && saved.challenge.choices[2].en,
    )
    .toBe("Suggested English answer");
  expect(saved?.challenge).toMatchObject({ correctIndex: 2 });
});

test.beforeEach(async({page})=>{await page.route("**/api/admin/reports?*",route=>route.fulfill({json:{reports:[]}}));});
