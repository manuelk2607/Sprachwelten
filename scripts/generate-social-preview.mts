import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const icon = await readFile(
  new URL("../public/favicon.svg", import.meta.url),
  "utf8",
);
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ["de", "en"] as const) {
    const de = locale === "de",
      page = await browser.newPage({
        viewport: { width: 1200, height: 630 },
        deviceScaleFactor: 1,
      });
    await page.setContent(
      `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f7f5ed;color:#292f28;padding:65px 75px;font-family:Arial,sans-serif}header{display:flex;align-items:center;gap:18px;font:50px Georgia}svg{width:56px;height:56px}.dot{color:#df674f}h1{font:76px/1.1 Georgia;margin:48px 0 26px;max-width:950px;letter-spacing:-2px}h1 span{color:#c7543e}.footer{margin-top:40px;display:flex;gap:14px;font-size:20px}.tag{background:#e1e7d7;border-radius:30px;padding:14px 22px}small{position:absolute;right:65px;bottom:55px;font-size:18px;color:#687060}</style></head><body><header>${icon}Sprachwelten<span class="dot">.</span></header><h1>${de ? "Sprachen entdecken.<br><span>Zusammen spielen.</span>" : "Discover languages.<br><span>Play together.</span>"}</h1><div class="footer"><span class="tag">${de ? "Kostenlos im Browser" : "Free browser games"}</span><span class="tag">${de ? "Quiz · Tabu · Zungenbrecher" : "Quiz · Taboo · Tongue twisters"}</span></div><small>DE / EN</small></body></html>`,
    );
    await page.screenshot({
      path: new URL(`../public/social-preview-${locale}.png`, import.meta.url)
        .pathname,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
