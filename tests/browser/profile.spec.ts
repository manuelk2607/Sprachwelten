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
  let loggedIn = true;
  let fail = false;
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: loggedIn
        ? {
            user,
            session: {
              id: "qa-session",
              userId: user.id,
              expiresAt: "2099-01-01T00:00:00Z",
              token: "fixture-only",
            },
          }
        : null,
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
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("textbox", { name: "Anzeigename", exact: true }),
  ).toHaveValue("Manuel");
  return {
    guest: () => {
      loggedIn = false;
    },
    updates,
    fail: () => {
      fail = true;
    },
  };
}
test("own profile saves, refreshes, cancels edits and omits avatars on desktop/mobile", async ({
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
  await page
    .locator("form")
    .filter({
      has: page.getByRole("heading", { name: "Dein Profil", exact: true }),
    })
    .getByRole("button", { name: "Abbrechen", exact: true })
    .click();
  await expect(name).toHaveValue("Manuel");
  expect(state.updates).toHaveLength(0);
  await name.fill("Neuer Name");
  await expect(
    page.getByLabel("Profilbild-Adresse (HTTPS)", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Speichern", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profil gespeichert.");
  expect(state.updates[0]).toEqual({ name: "Neuer Name" });
  await page.reload();
  await expect(name).toHaveValue("Neuer Name");
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

test("password changes validate confirmation, revoke other sessions and clear password fields", async ({
  page,
}) => {
  await profile(page);
  const changes: unknown[] = [];
  await page.route("**/api/auth/change-password", (route) => {
    changes.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        token: "fixture-only",
        user: {
          id: "qa-profile",
          name: "Manuel",
          email: "qa@sprachwelten.invalid",
        },
      },
    });
  });
  await page
    .getByLabel("Aktuelles Passwort", { exact: true })
    .fill("old-password");
  await page.getByLabel("Neues Passwort", { exact: true }).fill("new-password");
  await page
    .getByLabel("Neues Passwort wiederholen", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Passwort ändern", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Die neuen Passwörter stimmen nicht überein.",
  );
  expect(changes).toHaveLength(0);
  await page
    .getByLabel("Neues Passwort wiederholen", { exact: true })
    .fill("new-password");
  await page
    .getByRole("button", { name: "Passwort ändern", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Passwort geändert. Andere Sitzungen wurden abgemeldet.",
  );
  expect(changes).toEqual([
    {
      currentPassword: "old-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    },
  ]);
  await expect(
    page.getByLabel("Aktuelles Passwort", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("Neues Passwort", { exact: true })).toHaveValue(
    "",
  );
});
test("email change binds the verification code to the requested address and signs out only after confirmation", async ({
  page,
}) => {
  const state = await profile(page);
  const requests: unknown[] = [],
    confirms: unknown[] = [];
  let revoked = 0,
    signedOut = 0;
  await page.route("**/api/auth/email-otp/request-email-change", (route) => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/auth/email-otp/change-email", (route) => {
    const input = route.request().postDataJSON();
    confirms.push(input);
    return route.fulfill(
      input.otp === "123456"
        ? { json: { success: true } }
        : {
            status: 400,
            json: { code: "INVALID_OTP", message: "Invalid OTP" },
          },
    );
  });
  await page.route("**/api/auth/revoke-other-sessions", (route) => {
    revoked++;
    return route.fulfill({ json: { status: true } });
  });
  await page.route("**/api/auth/sign-out", (route) => {
    signedOut++;
    state.guest();
    return route.fulfill({ json: { success: true } });
  });
  await page
    .getByLabel("Neue E-Mail-Adresse", { exact: true })
    .fill("new@sprachwelten.invalid");
  await page
    .getByRole("button", { name: "Bestätigungscode anfordern", exact: true })
    .click();
  await expect(
    page.getByLabel("Neue E-Mail-Adresse", { exact: true }),
  ).toBeDisabled();
  expect(signedOut).toBe(0);
  expect(requests).toEqual([{ newEmail: "new@sprachwelten.invalid" }]);
  await page.getByLabel("Bestätigungscode", { exact: true }).fill("000000");
  await page
    .getByRole("button", { name: "E-Mail-Adresse bestätigen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Der Code ist ungültig oder abgelaufen.",
  );
  expect(signedOut).toBe(0);
  await page.getByLabel("Bestätigungscode", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "E-Mail-Adresse bestätigen", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Willkommen zurück.", exact: true }),
  ).toBeVisible();
  await expect.poll(() => signedOut).toBe(1);
  expect(revoked).toBe(1);
  expect(confirms.at(-1)).toEqual({
    newEmail: "new@sprachwelten.invalid",
    otp: "123456",
  });
});
test("disabled email service reports an actionable error and leaves the current account unchanged", async ({
  page,
}) => {
  await profile(page);
  await page.route("**/api/auth/email-otp/request-email-change", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Change email with OTP is disabled" },
    }),
  );
  await page
    .getByLabel("Neue E-Mail-Adresse", { exact: true })
    .fill("new@sprachwelten.invalid");
  await page
    .getByRole("button", { name: "Bestätigungscode anfordern", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Die E-Mail-Änderung ist beim Anmeldedienst noch nicht freigeschaltet.",
  );
  await expect(
    page.getByLabel("Bestätigungscode", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("E-Mail", { exact: true })).toHaveValue(
    "qa@sprachwelten.invalid",
  );
});
