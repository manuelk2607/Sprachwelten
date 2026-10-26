import { test, expect, type Page } from "@playwright/test";
import { act, createGame, viewGame, joinGame } from "../../lib/game";
import { seedEntries } from "../../lib/seeds";
import { tabooSeeds } from "../../lib/taboo-seeds";
import type { RoomAction } from "../../lib/content";
async function guest(page: Page) {
  for (const [url, json] of [
    ["**/api/auth/get-session**", null],
    ["**/api/audio", { available: false }],
    ["**/api/translations", { available: false }],
    ["**/api/regions", { regions: {} }],
    ["**/api/entries/duplicates?*", { duplicate: null }],
  ] as const)
    await page.route(url, (route) => route.fulfill({ json }));
}
async function contribute(page: Page) {
  const ready = page.waitForResponse((r) =>
    r.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  return page.getByRole("dialog");
}
test("unfinished contributions are saved and restored, and explicit discard removes the browser copy", async ({
  page,
}) => {
  await guest(page);
  let dialog = await contribute(page);
  await dialog.locator('[name="phrase"]').fill("Ein langer Entwurf");
  await dialog.locator('[name="hint"]').fill("Ein unfertiger Tipp");
  await dialog
    .locator('[name="challenge.choices.0.de"]')
    .fill("Eine teilweise Antwort");
  await expect(page.getByRole("status")).toContainText(
    "Entwurf in diesem Browser gespeichert.",
  );
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Entwurf wiederherstellen", exact: true })
    .click();
  await expect(dialog.locator('[name="phrase"]')).toHaveValue(
    "Ein langer Entwurf",
  );
  await expect(dialog.locator('[name="hint"]')).toHaveValue(
    "Ein unfertiger Tipp",
  );
  await expect(dialog.locator('[name="challenge.choices.0.de"]')).toHaveValue(
    "Eine teilweise Antwort",
  );
  await dialog.getByRole("button", { name: "Schließen", exact: true }).click();
  const ready = page.waitForResponse((r) =>
    r.url().includes("/api/auth/get-session"),
  );
  await page.reload();
  await ready;
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Entwurf verwerfen", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sprachwelten-contribution-draft:v1:guest"),
    ),
  ).toBeNull();
});
test("a revealed task is preselected for reporting and cannot be reported twice from the same view", async ({
  page,
}) => {
  await guest(page);
  const host = {
      id: crypto.randomUUID(),
      name: "QA",
      score: 0,
      tokenHash: "fixture",
    },
    g = createGame("FEEDXX", host, "de", "meaning-quiz");
  g.totalRounds = 1;
  act(g, host.id, { action: "start" }, seedEntries);
  act(g, host.id, {
    action: "vote",
    optionId: g.round!.options.find((o) => o.solution)!.id,
  });
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:FEEDXX", "a".repeat(64)),
  );
  await page.route("**/api/rooms/FEEDXX", (route) =>
    route.fulfill({ json: { room: viewGame(g, host.id) } }),
  );
  let sent: Record<string, unknown> | undefined;
  await page.route("**/api/rooms/FEEDXX/reports", (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/room/FEEDXX");
  await page
    .getByRole("button", {
      name: "Problem mit dieser Aufgabe melden",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(g.round!.entry.phrase, { exact: true }),
  ).toBeVisible();
  await dialog.locator("textarea").fill("Die Antwort ist unklar.");
  await dialog
    .getByRole("button", { name: "Meldung senden", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Problem gemeldet", exact: true }),
  ).toBeDisabled();
  expect(sent?.matchId).toBe(g.matchId);
  expect(sent?.roundNumber).toBe(1);
  expect(sent).not.toHaveProperty("entryId");
});
test("Taboo hides the card from guessers while the describer starts a timed turn and skips with a penalty", async ({
  page,
}) => {
  await guest(page);
  const host = {
      id: crypto.randomUUID(),
      name: "Host",
      score: 0,
      tokenHash: "fixture",
    },
    g = createGame("TABUXX", host, "de", "taboo");
  for (let n = 1; n < 4; n++)
    joinGame(g, {
      id: crypto.randomUUID(),
      name: "Guest " + n,
      score: 0,
      tokenHash: "fixture" + n,
    });
  g.totalRounds = 1;
  act(
    g,
    host.id,
    { action: "start" },
    tabooSeeds.filter((e) => e.language === "de").slice(0, 4),
  );
  let viewer = host.id;
  await page.addInitScript(() =>
    localStorage.setItem("sprachwelten-room:TABUXX", "a".repeat(64)),
  );
  await page.route("**/api/rooms/TABUXX", (route) => {
    if (route.request().method() === "POST")
      act(g, viewer, route.request().postDataJSON() as RoomAction);
    return route.fulfill({ json: { room: viewGame(g, viewer) } });
  });
  await page.goto("/room/TABUXX");
  await expect(
    page.getByText(g.round!.entry.phrase, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "60 Sekunden starten", exact: true })
    .click();
  await expect(page.getByRole("timer")).toContainText("s");
  await page
    .getByRole("button", {
      name: "Überspringen · Punkt für das andere Team",
      exact: true,
    })
    .click();
  expect(g.taboo!.scores[1]).toBe(1);
  viewer = g.taboo!.teams[0].find((id) => id !== g.taboo!.describerId)!;
  await page.reload();
  await expect(
    page.getByText(g.round!.entry.phrase, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Dein Rateversuch", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Überspringen · Punkt für das andere Team",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("Taboo is a word-connections category and allows multiple original languages", async ({
  page,
}) => {
  await page.route('**/api/rooms/languages?*',r=>r.fulfill({json:{languages:[{code:'de',count:3},{code:'en',count:3}]}}));
  await guest(page);
  const ready = page.waitForResponse((r) =>
    r.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  const quick = page.locator(".quick-start");
  await quick
    .getByRole("combobox", { name: "Spielmodus", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Wortverbindungen", exact: true })
    .click();
  await quick
    .getByRole("button", { name: "Raum erstellen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Kategorie", exact: true })
    .click();
  await page.getByRole("option", { name: "Tabu", exact: true }).click();
  await expect(
    dialog.getByRole("checkbox", { name: "Deutsch (3)", exact: true }),
  ).toBeChecked();
  await dialog.getByRole("checkbox", { name: "Englisch (3)", exact: true }).check();
  await dialog
    .getByRole("checkbox", { name: "Deutsch (3)", exact: true })
    .uncheck();
  await expect(
    dialog.getByRole("checkbox", { name: "Englisch (3)", exact: true }),
  ).toBeDisabled();
});
test("later uncontrolled draft edits are saved and successful publication clears only the active draft", async ({
  page,
}) => {
  await guest(page);
  await page.route("**/api/entries", (route) =>
    route.fulfill({ status: 201, json: { entry: { id: "draft-published" } } }),
  );
  const dialog = await contribute(page);
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Wort", exact: true }).click();
  await dialog.locator('[name="phrase"]').fill("Mein Entwurfswort");
  await dialog.locator('[name="literal"]').fill("Erste Bedeutung");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("sprachwelten-contribution-draft:v1:guest") ??
              "{}",
          ).fields?.literal,
      ),
    )
    .toBe("Erste Bedeutung");
  await dialog.locator('[name="literal"]').fill("Nachträglich geändert");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("sprachwelten-contribution-draft:v1:guest") ??
              "{}",
          ).fields?.literal,
      ),
    )
    .toBe("Nachträglich geändert");
  await page.evaluate(() =>
    localStorage.setItem(
      "sprachwelten-contribution-draft:v1:other-account",
      "other copy",
    ),
  );
  await dialog
    .getByRole("button", { name: "Beitrag veröffentlichen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sprachwelten-contribution-draft:v1:guest"),
    ),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sprachwelten-contribution-draft:v1:other-account"),
    ),
  ).toBe("other copy");
});
test("administration quality filters reset pagination and reports can be resolved then reopened", async ({
  page,
}) => {
  const session = {
    session: {
      id: "qa-session",
      userId: "qa-admin",
      expiresAt: "2099-01-01T00:00:00Z",
      token: "fixture-only",
    },
    user: {
      id: "qa-admin",
      name: "QA Admin",
      email: "qa@sprachwelten.invalid",
      emailVerified: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  };
  await page.route("**/api/auth/get-session**", (r) =>
    r.fulfill({ json: session }),
  );
  await page.route("**/api/admin/access", (r) =>
    r.fulfill({ json: { isAdmin: true, unreadCount: 1 } }),
  );
  for (const [url, json] of [
    [
      "**/api/admin/inbox",
      { events: [], unreadCount: 0, pendingSuggestions: 0 },
    ],
    ["**/api/admin/bulk", { batches: [] }],
    ["**/api/admin/suggestions", { suggestions: [] }],
  ] as const)
    await page.route(url, (r) => r.fulfill({ json }));
  const queries: URLSearchParams[] = [];
  await page.route("**/api/admin/entries?*", (r) => {
    queries.push(new URL(r.request().url()).searchParams);
    return r.fulfill({ json: { entries: [], more: true } });
  });
  let resolved = false,
    revision = 0;
  await page.route("**/api/admin/reports?*", (r) =>
    r.fulfill({
      json: {
        reports:
          new URL(r.request().url()).searchParams.get("resolved") ===
          String(resolved)
            ? [
                {
                  id: "qa-report",
                  entryId: null,
                  snapshot: {
                    phrase: "Gemeldete Aufgabe",
                    kind: "word",
                    language: "de",
                  },
                  mode: "meaning-quiz",
                  reason: "answer",
                  note: "Bitte prüfen",
                  status: resolved ? "resolved" : "open",
                  revision,
                  createdAt: "2026-10-21T00:00:00Z",
                },
              ]
            : [],
      },
    }),
  );
  await page.route("**/api/admin/reports/qa-report", (r) => {
    const body = r.request().postDataJSON();
    expect(body.revision).toBe(revision);
    revision++;
    resolved = body.resolved;
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("/admin");
  await expect(
    page.getByText("Gemeldete Aufgabe", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("offset")).toBe("30");
  await page
    .getByRole("combobox", { name: "Qualitätsfilter", exact: true })
    .click();
  await page.getByRole("option", { name: "Album fehlt", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("quality")).toBe("missing-album");
  expect(queries.at(-1)?.get("offset")).toBe("0");
  await page
    .getByRole("button", { name: "Als erledigt markieren", exact: true })
    .click();
  await expect(
    page.getByText("Gemeldete Aufgabe", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", {
      name: "Erledigte Meldungen anzeigen",
      exact: true,
    })
    .check();
  await expect(
    page.getByText("Gemeldete Aufgabe", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Wieder öffnen", exact: true })
    .click();
  await expect(
    page.getByText("Gemeldete Aufgabe", { exact: true }),
  ).toHaveCount(0);
  expect(resolved).toBe(false);
});
