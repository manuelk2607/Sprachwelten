import { test } from "node:test";
import assert from "node:assert/strict";
import { editorialReviewInput } from "../lib/editorial-review-input";
const input = {
  entryRevision: 0,
  reviewRevision: 0,
  level: "introductory",
  reviewed: false,
  reviewedAt: "2026-10-24",
  sources: ["https://www.duden.de/rechtschreibung/Bemme"],
  rationale:
    "Die Bedeutung erfordert einen klar definierten regionalen Kontext.",
};
test("editorial assessments require real review dates, bounded revisions and explicit public sources without promoting draft reviews", () => {
  assert.equal(editorialReviewInput.parse(input).reviewed, false);
  assert.equal(
    editorialReviewInput.parse({ ...input, reviewed: true }).reviewed,
    true,
  );
  for (const bad of [
    { reviewedAt: "2026-02-31" },
    { reviewedAt: "2999-01-01" },
    { rationale: "Short" },
    { entryRevision: -1 },
    { reviewRevision: 0.1 },
    { level: "A1" },
    { sources: [] },
    { sources: [input.sources[0], input.sources[0]] },
    { sources: ["http://example.org"] },
    { sources: ["https://user:secret@example.org"] },
    { sources: ["invalid"] },
  ])
    assert.equal(
      editorialReviewInput.safeParse({ ...input, ...bad }).success,
      false,
      JSON.stringify(bad),
    );
});
