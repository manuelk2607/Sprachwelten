import test from "node:test";
import assert from "node:assert/strict";
import { translate } from "../lib/translations";
import { profileInput } from "../lib/profile";
import { updateOwnProfile, isProfileUpdatePath } from "../lib/profile-handler";
import { GameError } from "../lib/game-error";
import {
  editorialReviewStatus,
  difficultyLabels,
} from "../lib/editorial-review-input";
const req = (data: unknown, origin = "https://example.test") =>
  new Request("https://example.test/api/auth/update-user", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      cookie: "private-session=own",
    },
    body: JSON.stringify(data),
  });
test("profile accepts bounded names, rejects image and identity/role/email changes", () => {
  assert.deepEqual(profileInput.parse({ name: " Manuel " }), {
    name: "Manuel",
  });
  for (const data of [
    { name: "" },
    { name: "x".repeat(61) },
    { name: "A\u0000B" },
    { name: "A", image: "javascript:alert(1)" },
    { name: "A", image: "https://user:secret@example.test/pic" },
    { name: "A", userId: "other" },
    { name: "A", role: "admin" },
    { name: "A", email: "other@example.test" },
  ])
    assert.equal(profileInput.safeParse(data).success, false);
});
test("profile mutation requires own managed session, correct origin and strictly validated payload", async () => {
  let calls = 0;
  const session = async () => ({ id: "own" }),
    forward = async (r: Request) => {
      calls++;
      assert.equal(r.headers.get("cookie"), "private-session=own");
      assert.deepEqual(await r.json(), { name: "New name" });
      return Response.json(
        { status: true },
        { headers: { "set-cookie": "session=refreshed; HttpOnly" } },
      );
    };
  assert.equal(
    (
      await updateOwnProfile(
        req({ name: "New name" }),
        async () => {
          throw new GameError("Denied", 401);
        },
        forward,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await updateOwnProfile(
        req({ name: "New name" }, "https://other.test"),
        session,
        forward,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await updateOwnProfile(
        req({ name: "New name", id: "other" }),
        session,
        forward,
      )
    ).status,
    422,
  );
  const result = await updateOwnProfile(
    req({ name: " New name " }),
    session,
    forward,
  );
  assert.equal(result.status, 200);
  assert.equal(calls, 1);
  assert.match(result.headers.get("cache-control") ?? "", /no-store/);
  assert.match(result.headers.get("set-cookie") ?? "", /HttpOnly/);
});
test("editorial status distinguishes absence, draft, approval and invalidated content revisions without gating normal contributions", () => {
  const review = {
    contentRevision: 2,
    reviewRevision: 1,
    level: "intermediate" as const,
    reviewed: false,
    reviewedAt: "2026-10-28",
    sources: ["https://example.test"],
    rationale: "Documented editorial rationale.",
  };
  assert.equal(editorialReviewStatus(2, null), "unreviewed");
  assert.equal(editorialReviewStatus(2, review), "draft");
  assert.equal(
    editorialReviewStatus(2, { ...review, reviewed: true }),
    "approved",
  );
  assert.equal(
    editorialReviewStatus(3, { ...review, reviewed: true }),
    "outdated",
  );
  assert.equal(translate(difficultyLabels.advanced, "en"), "Advanced");
  assert.deepEqual(Object.values(difficultyLabels), [
    "Einstieg",
    "Mittel",
    "Fortgeschritten",
  ]);
});

test("encoded or normalized aliases cannot bypass profile validation", () => {
  for (const path of [
    ["update-user"],
    ["%75pdate-user"],
    ["%2575pdate-user"],
    ["ignore", "..", "update-user"],
    ["%2fupdate-user"],
  ])
    assert.equal(isProfileUpdatePath(path), true);
  for (const path of [
    ["admin", "update-user"],
    ["sign-in", "email"],
  ])
    assert.equal(isProfileUpdatePath(path), false);
});
