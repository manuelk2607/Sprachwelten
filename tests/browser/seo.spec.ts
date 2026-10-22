import { test, expect } from "@playwright/test";
import { publicGames, guidePath, sitemapEntries } from "../../lib/seo";
import { site } from "../../lib/site";
test("all guide pages render readable HTML, localized titles and canonical links without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
      javaScriptEnabled: false,
      baseURL: "http://localhost:5176",
    }),
    page = await context.newPage();
  try {
    for (const locale of ["de", "en"] as const)
      for (const game of publicGames) {
        const path = guidePath(game, locale),
          r = await page.goto(path);
        expect(r?.status(), path).toBe(200);
        await expect(page.locator("main h1")).toHaveCount(1);
        await expect(page.locator(".guide-steps li")).toHaveCount(3);
        await expect(page.locator("main")).toHaveAttribute(
          "class",
          "guide-page",
        );
        await expect(page.locator("main").locator("..")).toHaveAttribute(
          "lang",
          locale,
        );
        await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
          "href",
          new URL(path, site.url).href,
        );
        await expect(page).not.toHaveTitle("Sprachwelten");
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
          "content",
          new URL("/social-preview-" + locale + ".png", site.url).href,
        );
        const json = await page
          .locator('script[type="application/ld+json"]')
          .textContent();
        expect(JSON.parse(json!).url).toBe(new URL(path, site.url).href);
      }
  } finally {
    await context.close();
  }
});
test("sitemap and robots advertise only public pages, private screens opt out and unknown guides return 404", async ({
  request,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("xml");
  const xml = await sitemap.text();
  for (const entry of sitemapEntries()) expect(xml).toContain(entry.url);
  expect((xml.match(/<loc>/g) ?? []).length).toBe(30);
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: " + new URL("/sitemap.xml", site.url).href,
  );
  for (const path of ["/admin", "/me", "/room/ABC234"]) {
    const r = await request.get(path);
    expect(r.status()).toBe(200);
    expect(await r.text()).toMatch(/name="robots" content="noindex/);
  }
  expect((await request.get("/spiele/gibt-es-nicht")).status()).toBe(404);
  expect((await request.get("/en/games/missing")).status()).toBe(404);
});
test("language links have matching destinations and hydration preserves the guide title", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session**", (r) =>
    r.fulfill({ json: null }),
  );
  await page.goto("/spiele/tabu");
  await expect(page).toHaveTitle(/Tabu online spielen/);
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/games\/taboo$/);
  await expect(page).toHaveTitle(/Taboo online/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("link", { name: "DE", exact: true }).click();
  await expect(page).toHaveURL(/\/spiele\/tabu$/);
  await expect(page).toHaveTitle(/Tabu online spielen/);
});

test("localized home pages expose matching language, content and metadata before JavaScript runs", async ({
  request,
}) => {
  for (const [path, locale, title] of [
    ["/", "de", "kostenlose Sprachspiele"],
    ["/en", "en", "free online language games"],
  ] as const) {
    const response = await request.get(path),
      html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain('<html lang="' + locale + '"');
    expect(html).toContain(title);
    const canonical = html.match(
      /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/,
    )?.[1];
    expect(canonical).toBeTruthy();
    expect(new URL(canonical!).href).toBe(new URL(path, site.url).href);
    if (locale === "en") expect(html).toContain("Start game");
  }
});
