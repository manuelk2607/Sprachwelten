import test from "node:test";
import assert from "node:assert/strict";
import {
  accountSettingsError,
  passwordChangeInput,
  passwordFormInput,
  emailChangeInput,
  emailConfirmInput,
} from "../lib/account-settings";
import {
  accountMutationSchema,
  updateOwnProfile,
} from "../lib/profile-handler";
import { GameError } from "../lib/game-error";
test("password policy preserves whitespace, rejects mismatches and enforces other-session revocation", () => {
  assert.match(
    accountSettingsError({ code: "SESSION_NOT_FRESH" }),
    /erneut an/,
  );
  const data = { currentPassword: " old secret ", newPassword: " new secret " };
  assert.deepEqual(passwordChangeInput.parse(data), {
    ...data,
    revokeOtherSessions: true,
  });
  for (const bad of [
    { ...data, newPassword: "short" },
    { ...data, newPassword: data.currentPassword },
    { ...data, revokeOtherSessions: false },
    { ...data, userId: "other" },
  ])
    assert.equal(passwordChangeInput.safeParse(bad).success, false);
  assert.equal(
    passwordFormInput.safeParse({ ...data, confirmPassword: "mismatch" })
      .success,
    false,
  );
  assert.equal(
    passwordFormInput.safeParse({ ...data, confirmPassword: data.newPassword })
      .success,
    true,
  );
});
test("email and code payloads cannot replace account IDs or verification flags", () => {
  assert.deepEqual(emailChangeInput.parse({ newEmail: " new@example.test " }), {
    newEmail: "new@example.test",
  });
  for (const bad of [
    { newEmail: "bad" },
    { newEmail: "new@example.test", userId: "other" },
    { newEmail: "new@example.test", emailVerified: true },
  ])
    assert.equal(emailChangeInput.safeParse(bad).success, false);
  assert.equal(
    emailConfirmInput.safeParse({ newEmail: "new@example.test", otp: "123456" })
      .success,
    true,
  );
  assert.equal(
    emailConfirmInput.safeParse({ newEmail: "new@example.test", otp: "12345x" })
      .success,
    false,
  );
});
test("sensitive account routes enforce session/origin and validate encoded aliases before forwarding", async () => {
  for (const path of [
    ["change-password"],
    ["email-otp", "request-email-change"],
    ["email-otp", "change-email"],
    ["%2563hange-password"],
  ])
    assert.ok(accountMutationSchema(path));
  const request = (data: unknown, origin = "https://app.test") =>
    new Request("https://app.test/api/auth/change-password", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(data),
    });
  let calls = 0;
  const forward = async (r: Request) => {
      calls++;
      assert.deepEqual(await r.json(), {
        currentPassword: "old-secret",
        newPassword: "new-secret",
        revokeOtherSessions: true,
      });
      return Response.json({ status: true });
    },
    payload = { currentPassword: "old-secret", newPassword: "new-secret" };
  assert.equal(
    (
      await updateOwnProfile(
        request(payload),
        async () => {
          throw new GameError("Denied", 401);
        },
        forward,
        passwordChangeInput,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await updateOwnProfile(
        request(payload, "https://other.test"),
        async () => ({ id: "own" }),
        forward,
        passwordChangeInput,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await updateOwnProfile(
        request({ ...payload, userId: "other" }),
        async () => ({ id: "own" }),
        forward,
        passwordChangeInput,
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await updateOwnProfile(
        request(payload),
        async () => ({ id: "own" }),
        forward,
        passwordChangeInput,
      )
    ).status,
    200,
  );
  assert.equal(calls, 1);
});
