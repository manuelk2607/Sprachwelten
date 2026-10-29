import assert from "node:assert/strict";
import { isolatedAuthTarget } from "../lib/qa-target.ts";
import { z } from "zod";

const base = isolatedAuthTarget(process.env).href;
const cookies = new Map<string, string>();
const authResponse = z
  .object({
    user: z
      .object({ id: z.string(), name: z.string().optional() })
      .nullable()
      .optional(),
  })
  .nullable();
async function request(path: string, body?: unknown, useCookies = true) {
  const res = await fetch(base + path, {
    signal: AbortSignal.timeout(30000),
    method: body ? "POST" : "GET",
    headers: {
      ...(body
        ? { "Content-Type": "application/json", Origin: new URL(base).origin }
        : {}),
      ...(useCookies
        ? { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (useCookies)
    for (const raw of res.headers.getSetCookie()) {
      const part = raw.split(";")[0],
        i = part.indexOf("=");
      cookies.set(part.slice(0, i), part.slice(i + 1));
    }
  return { status: res.status, data: authResponse.parse(await res.json()) };
}
// One synthetic, non-deliverable identity in the expiring QA branch only.
const email = `qa-${crypto.randomUUID()}@sprachwelten.invalid`,
  password = crypto.randomUUID() + "!Aa1";
try {
  const signup = await request("/sign-up/email", {
    email,
    password,
    name: "Disposable QA integration",
  });
  assert.equal(
    signup.status,
    200,
    "Isolated QA signup failed (no credentials are logged).",
  );
  const userId = signup.data?.user?.id;
  assert.ok(userId);
  await request("/sign-out", {});
  const denied = await request("/sign-in/email", {
    email,
    password: password + "wrong",
  });
  assert.ok(denied.status >= 400);
  const login = await request("/sign-in/email", { email, password });
  assert.equal(login.status, 200);
  assert.equal(login.data?.user?.id, userId);
  const updated = await request("/update-user", {
    name: "Disposable QA profile updated",
    image: null,
  });
  assert.equal(updated.status, 200);
  const profile = await request("/get-session?disableCookieCache=true");
  assert.equal(profile.data?.user?.id, userId);
  assert.equal(profile.data?.user?.name, "Disposable QA profile updated");
  console.log(
    "PASS: real isolated managed profile update preserves the current account identity.",
  );
  const session = await request("/get-session");
  assert.equal(session.data?.user?.id, userId);
  const anonymous = await request("/get-session", undefined, false);
  assert.ok(!anonymous.data?.user);
  const replay = [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  await request("/sign-out", {});
  const old = await fetch(base + "/get-session", {
    signal: AbortSignal.timeout(30000),
    headers: { Cookie: replay },
  });
  assert.ok(!authResponse.parse(await old.json())?.user);
  console.log(
    "PASS: real isolated managed signup, rejected password, login, session recovery, anonymous protection and logout/replay.",
  );
  console.log(
    "NOT RUN: OTP delivery, code confirmation/expiry; requires an authorized reachable test mailbox.",
  );
} finally {
  try {
    await request("/sign-out", {});
  } catch {
    /* Branch expiration removes the synthetic identity and residual sessions. */
  }
}
