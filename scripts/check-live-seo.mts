import assert from "node:assert/strict";
import { sitemapEntries } from "../lib/seo";
const origin = "https://sprachwelten.maki26.workers.dev";
const urls = sitemapEntries().map((page) => page.url);
const failures: string[] = [];
const attrs = (tag: string) =>
  Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map((match) => [
      match[1].toLowerCase(),
      match[2],
    ]),
  );
for (let index = 0; index < urls.length; index += 4)
  await Promise.all(
    urls.slice(index, index + 4).map(async (url) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(30000) }),
          html = await r.text();
        assert.equal(r.status, 200);
        assert.equal(new URL(r.url).href, new URL(url).href);
        assert.match(html, /<title>[^<]+<\/title>/);
        const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) =>
          attrs(match[0]),
        );
        assert.equal(
          links.filter((link) => link.rel === "canonical").length,
          1,
        );
        assert.equal(
          new URL(links.find((link) => link.rel === "canonical")!.href).href,
          new URL(url).href,
        );
        for (const [language, href] of Object.entries(
          sitemapEntries().find((page) => page.url === url)!.alternates
            .languages,
        )) {
          const alternate = links.find(
            (link) => link.rel === "alternate" && link.hreflang === language,
          );
          assert.ok(alternate, language + " alternate missing");
          assert.equal(new URL(alternate.href).href, new URL(href).href);
        }
        const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map((match) =>
          attrs(match[0]),
        );
        assert.ok(
          meta.some((m) => m.name === "description" && m.content?.trim()),
        );
        assert.ok(
          !meta.some((m) => m.name === "robots" && /noindex/.test(m.content)),
        );
        assert.ok(!/noindex/i.test(r.headers.get("x-robots-tag") ?? ""));
        assert.ok(
          links.some(
            (link) => link.rel === "alternate" && link.hreflang === "de",
          ),
        );
        assert.ok(
          links.some(
            (link) => link.rel === "alternate" && link.hreflang === "en",
          ),
        );
      } catch (error) {
        failures.push(new URL(url).pathname + ": " + (error as Error).message);
      }
    }),
  );
const robots = await (await fetch(origin + "/robots.txt")).text();
assert.match(
  robots,
  /Sitemap: https:\/\/sprachwelten\.maki26\.workers\.dev\/sitemap.xml/i,
);
assert.ok(!/Disallow: \/\s*$/m.test(robots));
const xml = await (await fetch(origin + "/sitemap.xml")).text();
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.deepEqual(locs.sort(), [...urls].sort());
for (const path of ["/admin", "/me", "/profile", "/room/QA1234"].filter(
  (path) => path !== "/profile" || !process.argv.includes("--before-deploy"),
)) {
  const r = await fetch(origin + path),
    html = await r.text();
  const meta = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0]));
  assert.ok(
    meta.some((m) => m.name === "robots" && /noindex/.test(m.content)),
    path + " must be noindex",
  );
  assert.ok(!locs.includes(origin + path));
}
assert.deepEqual(failures, []);
console.log(
  "PASS: 32 public pages, status/canonical/description/hreflang/indexability, sitemap/robots and private noindex routes. No indexing requests. Google index coverage remains external.",
);
