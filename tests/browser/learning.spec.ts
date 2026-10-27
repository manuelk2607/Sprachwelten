import { test, expect, type Page } from "@playwright/test";
import { canonicalLearningSeeds } from "../../lib/learning-seeds";
import { vocabularyDirection, type Notebook } from "../../lib/vocabulary";
import { draftKey } from "../../lib/contribution-draft";

for (const learningDraft of [true, false]) {
  test(`restoring a ${learningDraft ? 'learning' : 'game'} draft selects its own form and submission route`, async ({ page }) => {
    await fixtures(page);
    const entry = canonicalLearningSeeds[0];
    await page.addInitScript(({ key, draft }) => localStorage.setItem(key, JSON.stringify({...draft, updatedAt: Date.now()})), {
      key: draftKey('guest'),
      draft: {
        version: 1, updatedAt: Date.now(), kind: learningDraft ? 'vocabulary' : 'tongue_twister',
        phrase: learningDraft ? entry.phrase : 'Fischers Fritz fischt frische Fische.',
        sense: '', language: learningDraft ? entry.language : 'de', regionId: '', contextId: '',
        sourceLocale: 'de', translation: {}, reviewed: false, media: { text: true, audio: false },
        fields: { literal: learningDraft ? entry.literal : '', example: entry.example, sourceUrl: entry.sourceUrl },
        challenge: learningDraft ? entry.challenge : undefined,
      },
    });
    let endpoint = '';
    for (const path of ['/api/entries', '/api/learning/entries'])
      await page.route(`**${path}`, route => {
        endpoint = new URL(route.request().url()).pathname;
        return route.fulfill({ status: 201, json: { entry: { id: crypto.randomUUID() } } });
      });
    const ready = page.waitForResponse(response => response.url().includes('/api/auth/get-session'));
    await page.goto(learningDraft ? '/' : '/lernen');
    await ready;
    await page.locator('.header').getByRole('button', { name: 'Beitragen', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Entwurf wiederherstellen', exact: true }).click();
    await expect(dialog.locator('[name="kind"]')).toHaveValue(learningDraft ? 'vocabulary' : 'tongue_twister');
    await expect(dialog.locator('[name="phrase"]')).toHaveValue(learningDraft ? entry.phrase : 'Fischers Fritz fischt frische Fische.');
    await dialog.getByRole('combobox').first().click();
    await expect(page.getByRole('option', { name: learningDraft ? 'Redewendung' : 'Vokabel', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Beitrag veröffentlichen', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(endpoint).toBe(learningDraft ? '/api/learning/entries' : '/api/entries');
  });
}
async function fixtures(page: Page, signedIn = false) {
  const books: Notebook[] = [
    {
      id: crypto.randomUUID(),
      name: "Meine Wörter",
      description: "Unterwegs lernen",
      sourceLanguage: "de",
      targetLanguage: "en",
      revision: 1,
      count: 0,
      due: 0,
      difficult: 0,
      practiced: 0,
      attempts: 0,
      mistakes: 0,
    },
    {
      id: crypto.randomUUID(),
      name: "Zweites Heft",
      description: "",
      sourceLanguage: "de",
      targetLanguage: "en",
      revision: 1,
      count: 0,
      due: 0,
      difficult: 0,
      practiced: 0,
      attempts: 0,
      mistakes: 0,
    },
  ];
  const items = new Map(books.map((book) => [book.id, new Set<string>()])),
    practice: Record<string, unknown>[] = [];
  await page.route("**/api/auth/get-session**", (r) =>
    r.fulfill({
      json: signedIn
        ? {
            session: {
              id: "qa-session",
              userId: "qa-user",
              expiresAt: "2099-01-01T00:00:00Z",
              token: "qa-only",
            },
            user: {
              id: "qa-user",
              name: "QA",
              email: "qa@example.invalid",
              emailVerified: true,
            },
          }
        : null,
    }),
  );
  await page.route("**/api/admin/access", (r) =>
    r.fulfill({ json: { isAdmin: false } }),
  );
  await page.route("**/api/learning/notebooks", (r) => {
    if (r.request().method() === "POST") {
      const input = r.request().postDataJSON();
      const book = {
        ...input,
        id: crypto.randomUUID(),
        revision: 1,
        count: 0,
        due: 0,
        difficult: 0,
        practiced: 0,
        attempts: 0,
        mistakes: 0,
      };
      books.push(book);
      items.set(book.id, new Set());
      return r.fulfill({ status: 201, json: { notebook: book } });
    }
    return r.fulfill({
      json: {
        notebooks: books.map((book) => ({
          ...book,
          count: items.get(book.id)?.size ?? 0,
        })),
      },
    });
  });
  await page.route("**/api/learning/notebooks/*/items", (r) => {
    const id = r.request().url().split("/").at(-2)!,
      data = r.request().postDataJSON(),
      book = books.find((b) => b.id === id)!;
    expect(data.revision).toBe(book.revision);
    for (const entry of data.entryIds as string[]) {
      if (data.action === "add") items.get(id)!.add(entry);
      else if (data.action === "remove") items.get(id)!.delete(entry);
      else {
        items.get(id)!.delete(entry);
        items.get(data.targetId)!.add(entry);
        const target = books.find((b) => b.id === data.targetId)!;
        target.revision++;
      }
    }
    book.revision++;
    return r.fulfill({ json: { saved: true } });
  });
  await page.route("**/api/learning/notebooks/*", (r) => {
    const id = r.request().url().split("/").at(-1)!,
      index = books.findIndex((b) => b.id === id);
    if (r.request().method() === "DELETE") books.splice(index, 1);
    else
      books[index] = {
        ...books[index],
        ...r.request().postDataJSON(),
        revision: books[index].revision + 1,
      };
    return r.fulfill({ json: { saved: true } });
  });
  await page.route("**/api/learning/vocabulary?*", (r) => {
    const q = new URL(r.request().url()).searchParams,
      source = q.get("sourceLanguage")!,
      target = q.get("targetLanguage")!,
      book = q.get("notebookId");
    let cards = canonicalLearningSeeds.flatMap((entry) => {
      const card = vocabularyDirection(entry, source, target);
      return card ? [card] : [];
    });
    if (book) cards = cards.filter((card) => items.get(book)?.has(card.id));
    if (q.get("query"))
      cards = cards.filter((card) =>
        (card.source + " " + card.target)
          .toLowerCase()
          .includes(q.get("query")!.toLowerCase()),
      );
    return r.fulfill({
      json: {
        cards,
        more: false,
        topics: [
          { de: "Alltag · Übersetzen", en: "Everyday life · translation" },
        ],
        levels: ["A1"],
      },
    });
  });
  await page.route("**/api/learning?*", (r) => {
    const q = new URL(r.request().url()).searchParams;
    return r.fulfill({
      json: {
        entries: canonicalLearningSeeds.filter(
          (e) => e.kind === "grammar" && e.language === q.get("language"),
        ),
        languages: [
          { language: "de", count: 1 },
          { language: "en", count: 1 },
        ],
        stats: null,
        more: false,
        topics: [{ de: "Grammatik · Präsens", en: "Grammar · present tense" }],
        levels: ["A1"],
      },
    });
  });
  await page.route("**/api/learning/practice", (r) => {
    const data = r.request().postDataJSON() as Record<string, unknown>;
    practice.push(data);
    return r.fulfill({
      json:
        data.action === "vocabulary" || data.action === "start"
          ? {
              id: crypto.randomUUID(),
              prompt: "Übersetze: „der Apfel“.",
              exercise: data.exercise ?? "writing",
              choices: [],
              sourceLanguage: "de",
              targetLanguage: "en",
            }
          : data.action === "reveal"
            ? { answers: ["apple"], explanation: "Apple heißt Apfel." }
            : {
                correct: data.remembered ?? data.answer === "apple",
                answers: ["apple"],
                explanation: "Apple heißt Apfel.",
                dueAt: "2026-11-01T12:00:00Z",
              },
    });
  });
  for (const [url, json] of [
    ["**/api/regions", { regions: {} }],
    ["**/api/audio", { available: false }],
    ["**/api/translations", { available: false }],
    ["**/api/entries/duplicates?*", { duplicate: null }],
    ["**/api/entries?*", { entries: [] }],
  ] as const)
    await page.route(url, (r) => r.fulfill({ json }));
  return { books, items, practice };
}
test("Play and Learn stay separate with independent language pairs, legacy collection links and mobile navigation", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sammlung öffnen", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Lernen", exact: true }).click();
  await expect(page.locator(".learning-card")).toHaveCount(10);
  await expect(page.locator(".quick-start")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Ausgangssprache", exact: true }),
  ).toHaveText("Deutsch");
  await expect(
    page.getByRole("combobox", { name: "Zielsprache", exact: true }),
  ).toHaveText("Englisch");
  await page
    .getByRole("button", { name: "Sprachrichtung tauschen", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Ausgangssprache", exact: true }),
  ).toHaveText("Englisch");
  await expect(
    page.getByRole("combobox", { name: "Zielsprache", exact: true }),
  ).toHaveText("Deutsch");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Source language", exact: true }),
  ).toHaveText("English");
  await expect(
    page.getByRole("combobox", { name: "Target language", exact: true }),
  ).toHaveText("German");
  await page.locator('.header').getByRole('button',{name:'Contribute',exact:true}).click();
  await expect(page.getByRole('dialog').locator('[name="language"]')).toHaveValue('de');
  await expect(page.getByRole('dialog').getByRole('combobox',{name:'Translation language',exact:true})).toHaveText('English');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.goto("/#entdecken");
  await expect(page).toHaveURL(/\/(?:lernen|en\/learn)#entdecken$/);
  await page.goto("/en/learn");
  await expect(
    page.getByRole("heading", { name: "Learn", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("personal notebooks support creation, adding selected words, moving, editing and confirmed removal", async ({
  page,
}) => {
  const { books, items } = await fixtures(page, true);
  await page.goto("/lernen");
  await expect(page.locator(".learning-card")).toHaveCount(10);
  await expect(
    page.getByRole("link", { name: "Meine Beiträge", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Neues Vokabelheft", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Name des Hefts", exact: true })
    .fill("Urlaub");
  await dialog
    .getByRole("textbox", { name: "Beschreibung", exact: true })
    .fill("Für die Reise");
  await dialog.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(books.at(-1)?.name).toBe("Urlaub");
  await page.locator(".learning-card input[type=checkbox]").first().check();
  await page.getByRole("combobox", { name: "Zielheft", exact: true }).click();
  await page.getByRole("option", { name: "Meine Wörter", exact: true }).click();
  await page
    .getByRole("button", { name: "In Heft übernehmen", exact: true })
    .click();
  await expect.poll(() => items.get(books[0].id)?.size).toBe(1);
  await page
    .getByRole("combobox", { name: "Vokabelheft", exact: true })
    .click();
  await page.getByRole("option", { name: /^Meine Wörter ·/ }).click();
  await expect(page.locator(".learning-card")).toHaveCount(1);
  await page.locator(".learning-card input[type=checkbox]").check();
  await page.getByRole("combobox", { name: "Zielheft", exact: true }).click();
  await page.getByRole("option", { name: "Zweites Heft", exact: true }).click();
  await page
    .getByRole("button", { name: "In Zielheft verschieben", exact: true })
    .click();
  await expect.poll(() => items.get(books[1].id)?.size).toBe(1);
  await expect(page.locator(".learning-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Heft bearbeiten", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Name des Hefts", exact: true })
    .fill("Umbenannt");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Speichern", exact: true })
    .click();
  await expect.poll(() => books[0].name).toBe("Umbenannt");
  await page.getByRole("button", { name: "Heft löschen", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "Nur das Heft wird entfernt. Vokabeln und dein Lernstand bleiben erhalten.",
        { exact: true },
      ),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Heft endgültig löschen", exact: true })
    .click();
  await expect.poll(() => books.length).toBe(2);
});
test("selected writing practice retains its word selection and flashcards reveal before self-assessment", async ({
  page,
}) => {
  const { practice } = await fixtures(page, true);
  await page.goto("/lernen");
  await expect(page.locator(".learning-card")).toHaveCount(10);
  await page.locator(".learning-card input[type=checkbox]").first().check();
  await page
    .getByRole("button", { name: "Auswahl üben (1)", exact: true })
    .click();
  await expect(page.locator(".learning-card")).toHaveCount(0);
  expect(practice.at(-1)?.ids).toHaveLength(1);
  await page
    .getByRole("textbox", { name: "Deine Antwort", exact: true })
    .fill("wrong");
  await page
    .getByRole("button", { name: "Antwort prüfen", exact: true })
    .click();
  await expect(
    page.getByText("Apple heißt Apfel.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nächste Aufgabe", exact: true })
    .click();
  expect(practice.at(-1)?.ids).toHaveLength(1);
  await page
    .getByRole("button", { name: "Übung beenden", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Übungsform", exact: true }).click();
  await page.getByRole("option", { name: "Karteikarten", exact: true }).click();
  await page
    .getByRole("button", { name: "Wortschatz üben", exact: true })
    .click();
  await expect(
    page.getByText("Apple heißt Apfel.", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Lernkarte aufdecken", exact: true })
    .click();
  await expect(
    page.getByText("Apple heißt Apfel.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gewusst", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Richtig!", exact: true }),
  ).toBeVisible();
  expect(practice.at(-1)?.remembered).toBe(true);
});
test("learning contributions have confirmed language pairs and never offer game kinds", async ({
  page,
}) => {
  await fixtures(page);
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/learning/entries", (r) => {
    saved = r.request().postDataJSON();
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
  await expect(
    dialog.getByRole("heading", { name: "Lernbeitrag teilen", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("combobox").first().click();
  await expect(
    page.getByRole("option", { name: "Redewendung", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await dialog.locator("[name=phrase]").fill("apple");
  await dialog.locator("[name=literal]").fill("der Apfel");
  await dialog.getByLabel("Thema · DE", { exact: true }).fill("Obst");
  await expect(
    dialog.getByRole("combobox", {
      name: "Sprache der Übersetzung",
      exact: true,
    }),
  ).toHaveText("Deutsch");
  await dialog
    .getByRole("checkbox", {
      name: "Diese Bedeutung kann auch in umgekehrter Richtung abgefragt werden.",
      exact: true,
    })
    .check();
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect.poll(() => saved?.kind).toBe("vocabulary");
  expect(saved?.language).toBe("en");
  const challenge = saved?.challenge as {
    vocabulary: { translationLanguage: string };
    questions: unknown[];
  };
  expect(challenge.vocabulary.translationLanguage).toBe("de");
  expect(challenge.questions).toHaveLength(0);
});
test("grammar follows the selected target language and validates required rules and levels", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto("/lernen");
  await page
    .getByRole("button", { name: "Grammatik & Übungen", exact: true })
    .click();
  await expect(page.locator(".grammar-dashboard .learning-card")).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Grammatik beitragen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("[name=phrase]").fill("Present tense");
  await expect(dialog.locator("[name=meaning]")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Grammatikregel");
  await dialog
    .getByRole("combobox", { name: "Lernniveau", exact: true })
    .click();
  await page.getByRole("option", { name: "A2", exact: true }).click();
  await expect(dialog.locator('select[name="challenge.level"]')).toHaveValue(
    "A2",
  );
});
