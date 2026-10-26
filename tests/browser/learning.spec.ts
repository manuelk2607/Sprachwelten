import { test, expect } from "@playwright/test";
import { learningSeeds } from "../../lib/learning-seeds";
test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session**", (r) =>
    r.fulfill({ json: null }),
  );
  await page.route("**/api/learning?*", (r) => {
    const language = new URL(r.request().url()).searchParams.get("language");
    return r.fulfill({
      json: {
        entries: learningSeeds.filter((e) => e.language === language),
        languages: [
          { language: "en", count: 11 },
          { language: "de", count: 11 },
        ],
        stats: null,
      },
    });
  });
  await page.route("**/api/entries?*", (r) =>
    r.fulfill({ json: { entries: [] } }),
  );
  await page.route("**/api/regions", (r) =>
    r.fulfill({ json: { regions: {} } }),
  );
  await page.route("**/api/audio", (r) =>
    r.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/translations", (r) =>
    r.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/entries/duplicates?*", (r) =>
    r.fulfill({ json: { duplicate: null } }),
  );
});
test("Play and Learn are separate, preserve the legacy collection URL and localize on mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".quick-start")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sammlung öffnen", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Lernen", exact: true }).click();
  await expect(page).toHaveURL(/\/lernen$/);
  await expect(
    page.getByRole("heading", { name: "Lernen", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".quick-start")).toHaveCount(0);
  await expect(page.locator(".learning-card")).toHaveCount(11);
  await page
    .getByRole("button", { name: "Sammlung öffnen", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Beitragsart", exact: true }),
  ).toBeVisible();
  await page.goto("/#entdecken");
  await expect(page).toHaveURL(/\/lernen#entdecken$/);
  await page.goto("/en/learn");
  await expect(
    page.getByRole("heading", { name: "Learn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Learn", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("flashcards reveal on demand, exercises show feedback only after grading and filters reset old tasks", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/learning/practice", (r) => {
    const data = r.request().postDataJSON() as Record<string, unknown>;
    submitted = data;
    return r.fulfill({
      json:
        data.action === "start"
          ? {
              id: crypto.randomUUID(),
              exercise: "writing",
              prompt: "Übersetze: apple",
              choices: [],
            }
          : {
              correct: false,
              answers: ["der Apfel"],
              explanation: "Apfel ist ein maskulines Nomen.",
            },
    });
  });
  await page.goto("/lernen");
  const first = page.locator(".learning-card").first();
  await expect(first.getByText("der Apfel", { exact: true })).toHaveCount(0);
  await first
    .getByRole("button", { name: "Lernkarte öffnen", exact: true })
    .click();
  await expect(first.getByText("der Apfel", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Jetzt üben", exact: true }).click();
  await expect(
    page.getByText("Übersetze: apple", { exact: true }),
  ).toBeVisible();
  expect(submitted?.language).toBe("en");
  await expect(page.locator(".learning-card")).toHaveCount(0);
  await expect(page.getByText("der Apfel", { exact: true })).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Deine Antwort", exact: true })
    .fill("Apfeln");
  await page
    .getByRole("button", { name: "Antwort prüfen", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Noch nicht ganz.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Apfel ist ein maskulines Nomen.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Lernbereich", exact: true })
    .click();
  await page.getByRole("option", { name: "Grammatik", exact: true }).click();
  await expect(page.locator(".learning-practice")).toHaveCount(0);
  await expect(page.locator(".learning-card")).toHaveCount(1);
  await page.getByRole("button", { name: "DE", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Fällige Aufgaben wiederholen",
      exact: true,
    }),
  ).toBeDisabled();
});
test("learning contributions use existing form validation, bilingual prompts and persisted challenge data", async ({
  page,
}) => {
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/entries", (r) => {
    saved = r.request().postDataJSON() as Record<string, unknown>;
    return r.fulfill({
      status: 201,
      json: { entry: { id: crypto.randomUUID() } },
    });
  });
  await page.goto("/lernen");
  await page
    .getByRole("button", { name: "Vokabel beitragen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="phrase"]').fill("apple");
  await dialog.locator('[name="literal"]').fill("der Apfel");
  const editor = dialog.locator(".learning-editor");
  await editor.getByLabel("Thema · DE", { exact: true }).fill("Obst");
  await editor
    .getByLabel("Aufgabenstellung · DE", { exact: true })
    .fill("Wie heißt Apfel auf Englisch?");
  await editor
    .getByLabel("Richtige Lösungen (eine pro Zeile)", { exact: true })
    .fill("apple");
  await editor
    .getByLabel("Erklärung nach der Antwort · DE", { exact: true })
    .fill("Apple ist das englische Wort für Apfel.");
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect.poll(() => saved?.kind).toBe("vocabulary");
  expect(saved?.language).toBe('en');
  expect((saved?.challenge as { type: string }).type).toBe("learning");
  await expect(dialog).toHaveCount(0);
});
test('grammar rules are required and learning levels retain their values',async({page})=>{
  await page.goto('/lernen');await page.getByRole('button',{name:'Grammatik beitragen',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.locator('[name="phrase"]').fill('Present tense');
  await expect(dialog.locator('[name="meaning"]')).toBeVisible();
  await dialog.getByRole('button',{name:'Beitrag veröffentlichen',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Grammatikregel');
  await dialog.getByRole('combobox',{name:'Lernniveau',exact:true}).click();await page.getByRole('option',{name:'A2',exact:true}).click();await expect(dialog.locator('select[name="challenge.level"]')).toHaveValue('A2');
  await expect(dialog.getByRole('checkbox',{name:'Text',exact:true})).toBeChecked();await expect(dialog.getByRole('checkbox',{name:'Text',exact:true})).toBeDisabled();
});
test('learning pagination appends cards and changing filters resets the server offset',async({page})=>{
 const offsets:string[]=[],entry=learningSeeds[0];
 await page.route('**/api/learning?*',r=>{const q=new URL(r.request().url()).searchParams,offset=q.get('offset')??'0';offsets.push(offset);return r.fulfill({json:{entries:[{...entry,id:offset,phrase:offset==='0'?'First card':'Second card'}],languages:[],stats:null,more:offset==='0',levels:['A1'],topics:[{de:'Alltag',en:'Everyday'}]}});});
 await page.goto('/lernen');await expect(page.locator('.learning-card')).toHaveCount(1);await page.getByRole('button',{name:'Weitere Lernkarten laden',exact:true}).click();await expect(page.locator('.learning-card')).toHaveCount(2);expect(offsets).toEqual(['0','12']);
 await page.getByRole('combobox',{name:'Lernniveau',exact:true}).click();await page.getByRole('option',{name:'A1',exact:true}).click();await expect(page.locator('.learning-card')).toHaveCount(1);expect(offsets.at(-1)).toBe('0');
});
