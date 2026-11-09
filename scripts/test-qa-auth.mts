import {prepareLegacyProjectAccount} from '../lib/auth/project-accounts.ts';
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { isolatedAuthTarget, isolatedDatabaseTarget } from "../lib/qa-target.ts";
import { z } from "zod";
import {verifyWorldsProjectAccess} from "./test-worlds-project-access.mts";

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

async function verifyWorldsMapping(userId: string) {
  const sql = neon(isolatedDatabaseTarget(process.env).href);
  const issuer = "https://worlds-qa.invalid/auth";
  const subject = crypto.randomUUID();
  const notebook = crypto.randomUUID();
  const proof = crypto.randomUUID();
  const insert = (iss: string, sub: string, id: string) =>
    sql`INSERT INTO worlds_identity_links (issuer, subject, local_user_id)
        VALUES (${iss}, ${sub}, ${id}::uuid)`;
  try {
    await prepareLegacyProjectAccount(userId,(text,values)=>sql.query(text,values));
    await sql`INSERT INTO vocabulary_notebooks (id, owner_id, name, source_language, target_language)
              VALUES (${notebook}::uuid, ${userId}, 'QA Worlds', 'de', 'en')`;
    await insert(issuer, subject, userId);
    const rows = await sql`
      SELECT link.local_user_id, notebook.id AS notebook_id,
             EXISTS(SELECT 1 FROM app_admins WHERE user_id=link.local_user_id) AS is_admin
      FROM worlds_identity_links link
      JOIN vocabulary_notebooks notebook ON notebook.owner_id=link.local_user_id::text
      WHERE link.issuer=${issuer} AND link.subject=${subject} AND notebook.id=${notebook}::uuid`;
    assert.deepEqual(rows, [{local_user_id: userId, notebook_id: notebook, is_admin: false}]);
    assert.equal((await sql`SELECT 1 FROM worlds_identity_links
      WHERE issuer='https://other-qa.invalid/auth' AND subject=${subject}`).length, 0);

    await assert.rejects(() => insert(issuer, subject, userId), {code: "23505"});
    await assert.rejects(() => insert(issuer, crypto.randomUUID(), userId), {code: "23505"});
    await assert.rejects(() => insert(issuer, crypto.randomUUID(), crypto.randomUUID()), {code: "23503"});
    await sql`INSERT INTO worlds_link_proofs
      (proof_hash, issuer, subject, local_user_id, session_hash, expires_at)
      VALUES (${proof}, ${issuer}, ${subject}, ${userId}::uuid, 'fixture', now()+interval '1 minute')`;
    await assert.rejects(async () => sql.transaction([
      sql`DELETE FROM worlds_link_proofs WHERE proof_hash=${proof}`,
      insert(issuer, subject, userId),
    ]), {code: "23505"});
    assert.equal((await sql`SELECT 1 FROM worlds_link_proofs WHERE proof_hash=${proof}`).length, 1);
    await verifyWorldsProjectAccess(userId,issuer,subject);
    console.log("PASS: Worlds mapping preserves managed UUID and notebook ownership, isolates issuers, grants no role and rolls back conflicting writes.");
  } finally {
    await sql.transaction([
      sql`DELETE FROM worlds_link_proofs WHERE proof_hash=${proof}`,
      sql`DELETE FROM worlds_identity_links WHERE issuer=${issuer} AND subject=${subject}`,
      sql`DELETE FROM vocabulary_notebooks WHERE id=${notebook}::uuid AND owner_id=${userId}`,
    ]);
  }
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
  await verifyWorldsMapping(userId);
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
  });
  assert.equal(updated.status, 200);
  const profile = await request("/get-session?disableCookieCache=true");
  assert.equal(profile.data?.user?.id, userId);
  assert.equal(profile.data?.user?.name, "Disposable QA profile updated");
  console.log(
    "PASS: real isolated managed profile update preserves the current account identity.",
  );
  const other = await fetch(base + "/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
    },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(other.status, 200);
  const otherCookie = other.headers
    .getSetCookie()
    .map((raw) => raw.split(";")[0])
    .join("; ");
  assert.ok(
    (
      await request("/change-password", {
        currentPassword: password + "wrong",
        newPassword: password + "new",
        revokeOtherSessions: true,
      })
    ).status >= 400,
  );
  assert.equal(
    (
      await request("/change-password", {
        currentPassword: password,
        newPassword: password + "new",
        revokeOtherSessions: true,
      })
    ).status,
    200,
  );
  const revoked = await fetch(base + "/get-session?disableCookieCache=true", {
    headers: { Cookie: otherCookie },
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(!authResponse.parse(await revoked.json())?.user);
  await request("/sign-out", {});
  assert.ok(
    (await request("/sign-in/email", { email, password })).status >= 400,
  );
  assert.equal(
    (await request("/sign-in/email", { email, password: password + "new" }))
      .status,
    200,
  );
  console.log(
    "PASS: real QA password change, wrong current password rejection, old password invalidation, new password login and other-session revocation.",
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
