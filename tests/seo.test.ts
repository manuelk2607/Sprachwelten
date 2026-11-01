import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  publicGames,
  guidePath,
  guideMetadata,
  sitemapEntries,
  privateMetadata,
  findGuide,
} from "../lib/seo";
import { currentModeIds } from "../lib/modes";
import { withRequestLocale } from "../lib/request-locale";
test("every current game has reciprocal DE/EN guides and a unique public-only sitemap URL", () => {
  assert.deepEqual(
    publicGames.map((g) => g.mode).sort(),
    [...currentModeIds].sort(),
  );
  const pages = sitemapEntries();
  assert.equal(pages.length, 32);
  assert.equal(new Set(pages.map((p) => p.url)).size, 32);
  assert.ok(pages.some(p=>p.url.endsWith('/lernen')));
  assert.ok(pages.some(p=>p.url.endsWith('/en/learn')));
  for (const page of pages)
    assert.ok(!/\/api\/|\/room\/|\/admin|\/profile|\/me(?:\/|$)/.test(page.url));
  for (const locale of ["de", "en"] as const)
    for (const game of publicGames) {
      const path = guidePath(game, locale),
        meta = guideMetadata(game, locale);
      assert.equal(findGuide(game[locale], locale), game);
      assert.ok(String(meta.alternates?.canonical).endsWith(path));
      assert.ok(
        meta.alternates?.languages?.[locale]?.toString().endsWith(path),
      );
      assert.ok(pages.some((p) => p.url.endsWith(path)));
    }
  assert.equal(findGuide("legacy-bluff", "de"), undefined);
  assert.equal(findGuide("../admin", "de"), undefined);
  assert.deepEqual(privateMetadata.robots, { index: false, follow: false });
});
test("localized requests cannot spoof the language and preserve bodies, cookies and player credentials", async () => {
  const original = new Request("https://example.com/api/rooms", {
      method: "POST",
      headers: {
        Authorization: "Bearer fake-test-only",
        Cookie: "qa=test",
        "Content-Type": "application/json",
        "x-sprachwelten-locale": "en",
      },
      body: '{"action":"start"}',
    }),
    localized = withRequestLocale(original);
  assert.equal(localized.headers.get("x-sprachwelten-locale"), "de");
  assert.equal(localized.headers.get("Authorization"), "Bearer fake-test-only");
  assert.equal(localized.headers.get("Cookie"), "qa=test");
  assert.deepEqual(await localized.json(), { action: "start" });
  for (const path of ["/en/games", "/en/games/taboo", "/?lang=en"])
    assert.equal(
      withRequestLocale(new Request("https://example.com" + path)).headers.get(
        "x-sprachwelten-locale",
      ),
      "en",
    );
});
test("both social previews are real 1200 by 630 PNG images", () => {
  for (const locale of ["de", "en"]) {
    const bytes = readFileSync(
      new URL("../public/social-preview-" + locale + ".png", import.meta.url),
    );
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
  }
});
