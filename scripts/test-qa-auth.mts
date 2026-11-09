import {loadManagedOwner} from '../lib/auth/managed-owner.ts';
import {SESSION_COOKIE,token} from '@worlds-hub/auth';
import {hash} from '@worlds-hub/auth/store';
import {createWorldsConfig,worldsRoute} from '../lib/auth/worlds.ts';
import {managedLinkRoute} from '../lib/auth/worlds-managed-link.ts';
import {projectLogout} from '../lib/auth/worlds-logout.ts';
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
  const bff=token(),bffKey=await hash(bff),csrf=token();
  const insert = (iss: string, sub: string, id: string) =>
    sql`INSERT INTO worlds_identity_links (issuer, subject, local_user_id)
        VALUES (${iss}, ${sub}, ${id}::uuid)`;
  try {
    const query=(text:string,values:unknown[])=>sql.query(text,values);
    // Provider-origin requests use only this disposable QA account's own
    // existing cookies. No new sign-in and no provider configuration change.
    const native=isolatedAuthTarget(process.env),origin=native.origin;
    const settings={origin,issuer:native.href,cookieSecret:crypto.randomUUID()+crypto.randomUUID()};
    const ownerRequest=()=>new Request(origin+'/qa-managed-owner',{method:'POST',headers:{origin,cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}});
    const config=createWorldsConfig({WORLDS_PILOT_ENABLED:'true',WORLDS_PILOT_ORIGIN:origin,WORLDS_PILOT_DATABASE_HOST:isolatedDatabaseTarget(process.env).hostname,
      DATABASE_URL:process.env.DATABASE_URL,NEON_AUTH_BASE_URL:native.href.replace(/\/$/,''),WORLDS_CLIENT_ID:'synthetic-controller-client',WORLDS_ISSUER:issuer,WORLDS_RESOURCE:origin+'/api'},query);
    assert.ok(config);
    await config.store.putSession(bffKey,{issuer,sub:subject,csrf,name:'QA central fixture',email:'synthetic@sprachwelten.invalid',authenticatedAt:Date.now(),expires:Date.now()+120_000});
    const linkRequest=(action:string,form:URLSearchParams)=>new Request(origin+'/auth/'+(action==='logout'?'logout':'worlds/'+action)+'?locale=en&next=%2Fme',{method:'POST',headers:{origin,cookie:SESSION_COOKIE+'='+bff+'; '+[...cookies].map(([key,value])=>key+'='+value).join('; ')},body:form});
    const owner=async()=>{const current=await loadManagedOwner(ownerRequest(),settings,query);assert.equal(current.proof.accountId,userId);assert.equal(current.proof.privileged,false);return current;};
    const sourceSnapshot=()=>sql`SELECT id,"userId","createdAt","expiresAt" FROM neon_auth.session WHERE "userId"=${userId} ORDER BY id`;
    const originalSessions=await sourceSnapshot();assert.ok(originalSessions.length>0);
    const recoveryRequest=new Request(origin+'/auth/worlds/recovery',{headers:{cookie:SESSION_COOKIE+'='+bff}});
    const recovery=await worldsRoute(recoveryRequest,config,query,false);
    assert.equal(recovery.status,200);assert.deepEqual(await recovery.json(),{eligible:true});
    // Central proof remains synthetic here; native ownership is validated by
    // the actual managed provider before both HTTP controller actions. These
    // are direct local Request objects, not callbacks/cookies sent to the IdP.
    const staged=await managedLinkRoute(linkRequest('link',new URLSearchParams({csrf})),config,query,owner);
    assert.equal(staged.status,200);const stagedProof=/name="proof" value="([A-Za-z0-9_-]+)"/.exec(await staged.text())?.[1];assert.ok(stagedProof);
    const confirmations=await Promise.all([1,2].map(()=>managedLinkRoute(linkRequest('confirm',new URLSearchParams({csrf,proof:stagedProof})),config,query,owner)));
    assert.deepEqual(confirmations.map(result=>result.status).sort(),[303,409]);
    assert.equal(confirmations.find(result=>result.status===303)?.headers.get('location'),'/me');
    assert.equal((await sql`SELECT local_user_id FROM worlds_identity_links WHERE issuer=${issuer} AND subject=${subject}`)[0].local_user_id,userId);
    assert.equal((await sql`SELECT count(*)::int AS n FROM worlds_link_audit WHERE issuer=${issuer} AND subject=${subject}`)[0].n,1);
    const linkedRecovery=await worldsRoute(recoveryRequest,config,query,false);
    assert.equal(linkedRecovery.status,409);assert.deepEqual(await linkedRecovery.json(),{eligible:false});
    assert.deepEqual(await sourceSnapshot(),originalSessions,'Ownership checks must not create, replace or extend native sessions');
    console.log('PASS: actual HTTP takeover controller validates the existing owner with the official SDK, confirms once concurrently and preserves native IDs/creation/expiry without an extra login. Central BFF is synthetic.');
    await sql`INSERT INTO vocabulary_notebooks (id, owner_id, name, source_language, target_language)
              VALUES (${notebook}::uuid, ${userId}, 'QA Worlds', 'de', 'en')`;
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
    const signedOut=await projectLogout(linkRequest('logout',new URLSearchParams({csrf})),config,async()=>{const response=await request('/sign-out',{});return new Response(null,{status:response.status});});
    assert.equal(signedOut.status,303);assert.equal(await config.store.getSession(bffKey),null);
    assert.equal((await request('/get-session?disableCookieCache=true')).data?.user??null,null);
    assert.equal((await sql`SELECT count(*)::int AS n FROM neon_auth.session WHERE "userId"=${userId}`)[0].n,0);
    console.log('PASS: the local project logout ends the native fixture session and Worlds BFF; mapping, notebooks and contributions retain the historical owner.');
    console.log("PASS: Worlds mapping preserves managed UUID and notebook ownership, isolates issuers, grants no role and rolls back conflicting writes.");
  } finally {
    await sql.transaction([
      sql`DELETE FROM worlds_link_proofs WHERE proof_hash=${proof} OR (issuer=${issuer} AND subject=${subject})`,
      sql`DELETE FROM worlds_identity_links WHERE issuer=${issuer} AND subject=${subject}`,
      sql`DELETE FROM worlds_link_audit WHERE issuer=${issuer} AND subject=${subject}`,
      sql`DELETE FROM worlds_auth_sessions WHERE id=${bffKey}`,
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
