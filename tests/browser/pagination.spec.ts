import { test, expect } from "@playwright/test";
import { manuelGameEntries } from "../../lib/manuel-game-seeds";

for (const path of ["/me", "/admin"]) {
  test(`pagination on ${path} survives the initial search timer and cancelled searches`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-20T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-20T12:00:00.050Z"));
    await page.route("**/api/auth/get-session**", (route) =>
      route.fulfill({
        json: {
          session: {
            id: "qa",
            userId: "qa",
            expiresAt: "2099-01-01T00:00:00Z",
            token: "browser-fixture-only",
          },
          user: {
            id: "qa",
            name: "QA",
            email: "qa@sprachwelten.invalid",
            emailVerified: true,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        },
      }),
    );
    await page.route("**/api/admin/access", (route) =>
      route.fulfill({ json: { isAdmin: true, unreadCount: 0 } }),
    );
    await page.route("**/api/admin/inbox", (route) =>
      route.fulfill({
        json: { events: [], unreadCount: 0, pendingSuggestions: 0 },
      }),
    );
    await page.route("**/api/admin/suggestions", (route) =>
      route.fulfill({ json: { suggestions: [] } }),
    );
    await page.route("**/api/admin/bulk", (route) =>
      route.fulfill({ json: { batches: [] } }),
    );
    const requests: { q: string; offset: string | null }[] = [];
    const entry = { ...manuelGameEntries[0], revision: 0, deletedAt: null };
    await page.route(
      `**/api/${path === "/me" ? "me" : "admin"}/entries?*`,
      (route) => {
        const query = new URL(route.request().url()).searchParams;
        requests.push({ q: query.get("q") ?? "", offset: query.get("offset") });
        return route.fulfill({ json: { entries: [entry], more: true } });
      },
    );
    await page.goto(path);
    const heading = page.getByRole("heading", {
      name: entry.phrase,
      exact: true,
    });
    await expect
      .poll(
        async () => {
          await page.clock.runFor(1);
          return heading.isVisible();
        },
        { timeout: 10000, intervals: [50] },
      )
      .toBe(true);
    // Force avoids waiting for animation frames while time is paused and still
    // exercises the real click handler.
    await page
      .getByRole("button", { name: "Weiter", exact: true })
      .click({ force: true });
    await expect.poll(() => requests.at(-1)?.offset).toBe("30");
    await page.clock.runFor(1000);
    await expect(
      page.getByRole("button", { name: "Zurück", exact: true }),
    ).toBeEnabled();
    expect(requests.at(-1)).toEqual({ q: "", offset: "30" });

    const search =
      path === "/me"
        ? page.getByRole("searchbox", { name: "Eigene Beiträge durchsuchen" })
        : page.getByRole("textbox", { name: "Suchen", exact: true });
    await search.fill("Abgebrochene Suche");
    await page.clock.runFor(100);
    await search.fill("");
    await page.clock.runFor(1000);
    expect(requests.at(-1)).toEqual({ q: "", offset: "30" });

    await search.fill("Neue Suche");
    await page.clock.runFor(1000);
    await expect
      .poll(() => requests.at(-1))
      .toEqual({ q: "Neue Suche", offset: "0" });
  });
}

test.beforeEach(async({page})=>{await page.route("**/api/admin/reports?*",route=>route.fulfill({json:{reports:[]}}));});
