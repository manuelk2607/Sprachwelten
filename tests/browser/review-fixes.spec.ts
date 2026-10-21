import { test, expect, type Page } from "@playwright/test";
const code = "ABC234",
  oldToken = "a".repeat(64);
async function openJoin(page: Page) {
  await page.addInitScript(
    ({ code, token }) => {
      const key = "sprachwelten-room:" + code;
      if (!localStorage.getItem(key)) localStorage.setItem(key, token);
    },
    { code, token: oldToken },
  );
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  const ready = page.waitForResponse((response) =>
    response.url().includes("/api/auth/get-session"),
  );
  await page.goto("/");
  await ready;
  await page.locator("#home-room-code").fill(code);
  await page
    .locator(".quick-join")
    .getByRole("button", { name: "Raum beitreten", exact: true })
    .click();
  return page.getByRole("dialog");
}
test("joining a known room restores membership without a name or another join request", async ({
  page,
}) => {
  let joins = 0;
  await page.route("**/api/rooms/" + code, (route) => {
    expect(route.request().headers().authorization).toBe("Bearer " + oldToken);
    return route.fulfill({ json: { room: { code } } });
  });
  await page.route("**/api/rooms/" + code + "/join", (route) => {
    joins++;
    return route.fulfill({
      status: 409,
      json: { error: "No duplicate membership expected" },
    });
  });
  await page.route("**/room/" + code, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Resumed QA room</h1>",
    }),
  );
  const dialog = await openJoin(page);
  await expect(
    dialog.getByText(
      "Du bist diesem Raum bereits beigetreten. Wir stellen deinen bisherigen Zugang wieder her.",
    ),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Mitspielen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Resumed QA room" }),
  ).toBeVisible();
  expect(joins).toBe(0);
  expect(
    await page.evaluate(
      (code) => localStorage.getItem("sprachwelten-room:" + code),
      code,
    ),
  ).toBe(oldToken);
});
test("temporary room failures retain the saved identity and never fall through to joining", async ({
  page,
}) => {
  let joins = 0;
  await page.route("**/api/rooms/" + code, (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
      },
    }),
  );
  await page.route("**/api/rooms/" + code + "/join", (route) => {
    joins++;
    return route.fulfill({ json: {} });
  });
  const dialog = await openJoin(page);
  await dialog.getByRole("button", { name: "Mitspielen", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(joins).toBe(0);
  expect(
    await page.evaluate(
      (code) => localStorage.getItem("sprachwelten-room:" + code),
      code,
    ),
  ).toBe(oldToken);
});
test("an invalid saved membership can be replaced by a new valid join", async ({
  page,
}) => {
  const newToken = "b".repeat(64);
  await page.route("**/api/rooms/" + code, (route) =>
    route.fulfill({
      status: 403,
      json: { error: "Du bist nicht Teil dieses Raums." },
    }),
  );
  await page.route("**/api/rooms/" + code + "/join", (route) =>
    route.fulfill({ status: 201, json: { token: newToken, room: { code } } }),
  );
  await page.route("**/room/" + code, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>New QA membership</h1>",
    }),
  );
  const dialog = await openJoin(page);
  await dialog
    .getByRole("textbox", { name: "Dein Spielname", exact: true })
    .fill("QA New");
  await dialog.getByRole("button", { name: "Mitspielen", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New QA membership" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (code) => localStorage.getItem("sprachwelten-room:" + code),
      code,
    ),
  ).toBe(newToken);
});

test("administrators can confirm an undo and see its availability update in both languages", async ({
  page,
}) => {
  let undone = false;
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "qa",
          userId: "qa",
          expiresAt: "2099-01-01T00:00:00Z",
          token: "qa-only",
        },
        user: {
          id: "qa",
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
  await page.route("**/api/admin/entries?*", (route) =>
    route.fulfill({ json: { entries: [], more: false } }),
  );
  await page.route("**/api/admin/bulk", (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        undoBatchId: "a16588d2-c12f-4173-9024-8359aed89039",
      });
      undone = true;
      return route.fulfill({ json: { ok: true, count: 2 } });
    }
    return route.fulfill({
      json: {
        batches: [
          {
            id: "a16588d2-c12f-4173-9024-8359aed89039",
            createdAt: "2026-10-19T12:00:00Z",
            count: 2,
            canUndo: !undone,
          },
        ],
      },
    });
  });
  await page.goto("/admin");
  await page.getByText("Letzte Sammeländerungen", { exact: true }).click();
  await page
    .getByRole("button", { name: "Rückgängig machen", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Sammeländerung rückgängig machen?" }),
  ).toBeVisible();
  expect(undone).toBe(false);
  await dialog
    .getByRole("button", { name: "Rückgängig machen", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rückgängig machen", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByText("Recent bulk changes", { exact: true }),
  ).toBeVisible();
});

test.beforeEach(async({page})=>{await page.route("**/api/admin/reports?*",route=>route.fulfill({json:{reports:[]}}));});
