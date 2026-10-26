import { test, expect } from "@playwright/test";
test("discovery excludes the Taboo filter in DE and EN while contributions still allow it", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session**", (r) =>
    r.fulfill({ json: null }),
  );
  await page.route("**/api/entries?*", (r) =>
    r.fulfill({ json: { entries: [] } }),
  );
  const ready = page.waitForResponse((r) =>
    r.url().includes("/api/auth/get-session"),
  );
  await page.goto("/lernen");
  await ready;
  await page
    .getByRole("button", { name: "Sammlung öffnen", exact: true })
    .click();
  for (const [language, label] of [
    ["DE", "Beitragsart"],
    ["EN", "Contribution type"],
  ] as const) {
    await page.getByRole("button", { name: language, exact: true }).click();
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await expect(
      page.getByRole("option", {
        name: language === "DE" ? "Tabu" : "Taboo",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("option", {
        name: language === "DE" ? "Dialekt" : "Dialect",
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "DE", exact: true }).click();
  await page
    .locator(".header")
    .getByRole("button", { name: "Beitragen", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("combobox").first().click();
  await expect(
    page.getByRole("option", { name: "Tabu", exact: true }),
  ).toBeVisible();
});
