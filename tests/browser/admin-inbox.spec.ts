import { test, expect, type Page } from "@playwright/test";
import { entryInput } from "../../lib/content";

const entries = ["Erster Beitrag", "Zweiter Beitrag"].map((phrase, index) => ({
  ...entryInput.parse({
    kind: "word",
    phrase,
    language: "de",
    literal: "Test translation",
  }),
  id: `10000000-0000-4000-8000-00000000000${index + 1}`,
  status: "community" as const,
  authorName: "QA Contributor",
  authorId: "qa-contributor",
  createdAt: "2026-10-20T12:00:00Z",
  revision: 0,
  deletedAt: null,
}));

async function adminInbox(page: Page, withSuggestion = false) {
  const state = {
    read: new Set<string>(),
    posts: [] as { action: string; entryId?: string }[],
    detailFails: false,
    saveFails: false,
    listLoads: 0,
    listRequests: [] as {
      q: string;
      offset: string | null;
      unread: string | null;
    }[],
  };
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "qa-admin-session",
          userId: "qa-admin",
          expiresAt: "2099-01-01T00:00:00Z",
          token: "browser-fixture-only",
        },
        user: {
          id: "qa-admin",
          name: "QA Admin",
          email: "qa@sprachwelten.invalid",
          emailVerified: true,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      },
    }),
  );
  await page.route("**/api/admin/access", (route) =>
    route.fulfill({
      json: {
        isAdmin: true,
        unreadCount: entries.length - state.read.size + Number(withSuggestion),
      },
    }),
  );
  await page.route("**/api/admin/inbox", (route) => {
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON() as {
        action: string;
        entryId?: string;
      };
      state.posts.push(input);
      if (state.saveFails)
        return route.fulfill({ status: 503, json: { error: "Unavailable" } });
      if (input.entryId) state.read.add(input.entryId);
      else for (const entry of entries) state.read.add(entry.id);
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({
      json: {
        events: entries.map((entry) => ({
          ...entry,
          unread: !state.read.has(entry.id),
        })),
        unreadCount: entries.length - state.read.size,
        pendingSuggestions: Number(withSuggestion),
      },
    });
  });
  await page.route("**/api/admin/entries?*", (route) => {
    state.listLoads++;
    const params = new URL(route.request().url()).searchParams;
    const q = params.get("q") ?? "",
      unread = params.get("unread");
    state.listRequests.push({ q, unread, offset: params.get("offset") });
    const matches = entries.filter(
      (entry) =>
        entry.phrase.toLowerCase().includes(q.toLowerCase()) &&
        (unread !== "true" || !state.read.has(entry.id)),
    );
    return route.fulfill({ json: { entries: matches, more: false } });
  });
  await page.route("**/api/admin/bulk", (route) =>
    route.fulfill({ json: { batches: [] } }),
  );
  await page.route("**/api/admin/suggestions", (route) =>
    route.fulfill({
      json: {
        suggestions: withSuggestion
          ? [
              {
                id: "20000000-0000-4000-8000-000000000001",
                entryId: entries[0].id,
                authorName: "QA Suggestion",
                payload: entryInput.parse(entries[0]),
                note: "",
                baseRevision: 0,
                currentRevision: 0,
                revision: 0,
                createdAt: entries[0].createdAt,
                phrase: entries[0].phrase,
                literal: entries[0].literal,
                meaning: "",
              },
            ]
          : [],
      },
    }),
  );
  await page.route("**/api/entries/*", (route) => {
    if (state.detailFails)
      return route.fulfill({
        status: 503,
        json: {
          error:
            "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
        },
      });
    const entry = entries.find((entry) =>
      route.request().url().endsWith(entry.id),
    );
    return route.fulfill({
      json: { entry, explanations: [], canEdit: false, canSuggest: true },
    });
  });
  await page.route("**/api/audio", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/translations", (route) =>
    route.fulfill({ json: { available: false } }),
  );
  await page.route("**/api/regions", (route) =>
    route.fulfill({ json: { regions: {} } }),
  );
  await page.goto("/admin");
  await expect(page.locator(".inbox-heading")).toContainText("2 neue Beiträge");
  return state;
}

test("opening an inbox contribution marks only that entry read, refreshes the badge and survives reload", async ({
  page,
}) => {
  const state = await adminInbox(page);
  expect(state.posts).toEqual([]);
  await page.getByText("Neueste Beiträge", { exact: false }).click();
  await page
    .locator(".inbox-list")
    .getByRole("button", { name: entries[0].phrase, exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Beitrag bearbeiten", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => state.posts)
    .toEqual([{ action: "seen", entryId: entries[0].id }]);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.locator(".inbox-heading")).toContainText("1 neue Beiträge");
  await expect(page.locator(".notification-count")).toHaveText("1");
  await expect(page.locator(".inbox-list li").nth(0)).toContainText("Gelesen");
  await expect(page.locator(".inbox-list li").nth(1)).toHaveClass("unread");
  await page.reload();
  await expect(page.locator(".inbox-heading")).toContainText("1 neue Beiträge");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByText("Latest contributions", { exact: false }).click();
  await expect(page.locator(".inbox-list li").nth(0)).toContainText("Read");
  await page
    .getByRole("button", { name: "Mark all as read", exact: true })
    .click();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await expect(page.locator(".inbox-list .unread")).toHaveCount(0);
});

test("opening the admin list editor marks an entry read without resetting the current selection or list", async ({
  page,
}) => {
  const state = await adminInbox(page);
  const first = page.locator(".admin-entry").filter({
    has: page.getByRole("heading", { name: entries[0].phrase, exact: true }),
  });
  const selected = first.getByRole("checkbox");
  await selected.check();
  const loads = state.listLoads;
  await first.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect.poll(() => state.read.has(entries[0].id)).toBe(true);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.locator(".inbox-heading")).toContainText("1 neue Beiträge");
  await expect(selected).toBeChecked();
  expect(state.listLoads).toBe(loads);
});

test("reviewing a suggestion marks its original contribution read and keeps the suggestion pending", async ({
  page,
}) => {
  const state = await adminInbox(page, true);
  await page
    .getByRole("button", { name: "Prüfen & bearbeiten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Vorschlag prüfen und übernehmen",
      exact: true,
    }),
  ).toBeVisible();
  await expect.poll(() => state.read.has(entries[0].id)).toBe(true);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.locator(".inbox-heading")).toContainText(
    "1 neue Beiträge · 1 offene Vorschläge",
  );
  await expect(page.locator(".notification-count")).toHaveText("2");
});

test("failed entry loads and read-state saves leave entries unread and allow retry", async ({
  page,
}) => {
  const state = await adminInbox(page);
  await page.getByText("Neueste Beiträge", { exact: false }).click();
  const open = page
    .locator(".inbox-list")
    .getByRole("button", { name: entries[0].phrase, exact: true });
  state.detailFails = true;
  await open.click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(state.posts).toEqual([]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  state.detailFails = false;
  state.saveFails = true;
  await open.click();
  await expect.poll(() => state.posts.length).toBe(1);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Der Gelesen-Status konnte nicht gespeichert werden. Bitte öffne den Beitrag erneut.",
  );
  await expect(page.locator(".inbox-list li").nth(0)).toHaveClass("unread");
  state.saveFails = false;
  await open.click();
  await expect.poll(() => state.read.has(entries[0].id)).toBe(true);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".inbox-heading")).toContainText("1 neue Beiträge");
});

test("the unread filter combines with search, clears hidden selections and removes a contribution after reading", async ({
  page,
}) => {
  const state = await adminInbox(page);
  const first = page.locator(".admin-entry").filter({
    has: page.getByRole("heading", { name: entries[0].phrase, exact: true }),
  });
  await first.getByRole("checkbox").check();
  await first.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await expect.poll(() => state.read.has(entries[0].id)).toBe(true);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();

  const filter = page.getByRole("checkbox", {
    name: "Nur ungelesene Beiträge",
    exact: true,
  });
  await filter.check();
  await expect(page.locator(".admin-entry")).toHaveCount(1);
  await expect(page.locator(".admin-entry")).toContainText(entries[1].phrase);
  await expect(
    page.getByRole("button", { name: "Auswahl bearbeiten (0)", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() => state.listRequests.at(-1))
    .toEqual({
      q: "",
      offset: "0",
      unread: "true",
    });

  const search = page.getByRole("textbox", { name: "Suchen", exact: true });
  await search.fill("Erster");
  await expect(page.locator(".admin-entry")).toHaveCount(0);
  await expect
    .poll(() => state.listRequests.at(-1))
    .toEqual({
      q: "Erster",
      offset: "0",
      unread: "true",
    });
  await search.fill("");
  await expect(page.locator(".admin-entry")).toHaveCount(1);
  await page
    .locator(".admin-entry")
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  await expect.poll(() => state.read.has(entries[1].id)).toBe(true);
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await expect(page.locator(".admin-entry")).toHaveCount(0);
  await expect(filter).toBeChecked();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Unread contributions only", exact: true })
    .uncheck();
  await expect(page.locator(".admin-entry")).toHaveCount(2);
  await expect(
    page.locator('.admin-entry input[type="checkbox"]:checked'),
  ).toHaveCount(0);
});

test.beforeEach(async({page})=>{await page.route("**/api/admin/reports?*",route=>route.fulfill({json:{reports:[]}}));});
