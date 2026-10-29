import { test, expect, type Page } from "@playwright/test";
async function profile(page: Page) {
  let user = {
    id: "qa-profile",
    name: "Manuel",
    email: "qa@sprachwelten.invalid",
    image: null as string | null,
    emailVerified: false,
  };
  const updates: unknown[] = [];
  let fail = false;
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        user,
        session: {
          id: "qa-session",
          userId: user.id,
          expiresAt: "2099-01-01T00:00:00Z",
          token: "fixture-only",
        },
      },
    }),
  );
  await page.route("**/api/admin/access", (route) =>
    route.fulfill({ json: { isAdmin: false } }),
  );
  await page.route("**/api/auth/update-user", async (route) => {
    const input = route.request().postDataJSON();
    updates.push(input);
    if (fail)
      return route.fulfill({
        status: 503,
        json: { message: "Gerade nicht erreichbar." },
      });
    user = { ...user, ...input };
    return route.fulfill({ json: { status: true } });
  });
  await page.goto("/profile");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
  await expect(
    page.getByRole("textbox", { name: "Anzeigename", exact: true }),
  ).toHaveValue("Manuel");
  return {
    updates,
    fail: () => {
      fail = true;
    },
  };
}
test("own profile saves, refreshes, cancels edits and keeps private email read-only on desktop/mobile", async ({
  page,
}) => {
  const state = await profile(page);
  await expect(
    page.getByRole("link", { name: "Profil bearbeiten", exact: true }),
  ).toBeVisible();
  const name = page.getByRole("textbox", { name: "Anzeigename", exact: true }),
    email = page.getByRole("textbox", { name: "E-Mail", exact: true });
  await expect(email).toHaveAttribute("readonly", "");
  await name.fill("Discard");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(name).toHaveValue("Manuel");
  expect(state.updates).toHaveLength(0);
  await name.fill("Neuer Name");
  await page
    .getByRole("textbox", { name: "Profilbild-Adresse (HTTPS)", exact: true })
    .fill("https://example.test/avatar.png");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profil gespeichert.");
  expect(state.updates[0]).toEqual({
    name: "Neuer Name",
    image: "https://example.test/avatar.png",
  });
  await page.reload();
  await expect(name).toHaveValue("Neuer Name");
  await page
    .getByRole("textbox", { name: "Profilbild-Adresse (HTTPS)", exact: true })
    .fill("");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect.poll(() => state.updates.length).toBe(2);
  expect(state.updates[1]).toEqual({ name: "Neuer Name", image: null });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edit profile", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("failed profile saves preserve edits and guests cannot access personal fields", async ({
  page,
}) => {
  const state = await profile(page);
  state.fail();
  await page
    .getByRole("textbox", { name: "Anzeigename", exact: true })
    .fill("Keep draft");
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Anzeigename", exact: true }),
  ).toHaveValue("Keep draft");
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "E-Mail", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Bitte melde dich an, um dein Profil zu bearbeiten.", {
      exact: true,
    }),
  ).toBeVisible();
});
