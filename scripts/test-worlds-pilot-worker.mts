import "./sites-env.mts";
import assert from "node:assert/strict";
import { unstable_startWorker } from "wrangler";
import { worldsPilotOrigin } from "../lib/worlds-pilot.ts";

// Only synthetic bindings are used. These requests need no DB or IdP access.
const worker = await unstable_startWorker({
  config: "dist/server/wrangler.worlds-pilot.json",
  build: { bundle: false },
  bindings: {
    DATABASE_URL: {
      type: "plain_text",
      value: "postgres://demo:demo@ep-worlds-test.example.neon.tech/sprech",
    },
    NEON_AUTH_BASE_URL: {
      type: "plain_text",
      value: "https://ep-worlds-test.neonauth.example.neon.tech/sprech/auth",
    },
    NEON_AUTH_COOKIE_SECRET: {
      type: "plain_text",
      value: "local-synthetic-value-only-32-characters",
    },
  },
  dev: {
    remote: false,
    persist: false,
    origin: { hostname: new URL(worldsPilotOrigin).hostname, secure: true },
    server: { hostname: "127.0.0.1", port: 0 },
    inspector: { port: 0 },
    logLevel: "error",
  },
});

async function check(path: string, status: number, method = "GET") {
  const response = await worker.fetch(worldsPilotOrigin + path, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, status, path);
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow", path);
  assert.equal(
    response.headers.get("cache-control"),
    "private, no-store",
    path,
  );
  return response;
}

try {
  await worker.ready;
  assert.match(
    await (await check("/robots.txt", 200)).text(),
    /Disallow: \/\n/,
  );
  await check("/sitemap.xml", 404);
  assert.match(await (await check("/favicon.svg", 200)).text(), /<svg/);
  assert.match(
    await (await check("/lernen", 200)).text(),
    /<html[^>]+lang="de"/,
  );
  assert.match(
    await (await check("/en/learn", 200)).text(),
    /<html[^>]+lang="en"/,
  );
  // Method checks run before the database-backed authentication rate limit.
  await check("/auth/status", 405, "POST");
  await check("/auth/worlds/profile", 405);
  await worker.patchConfig({
    bindings: {
      ...worker.config.bindings,
      NEON_AUTH_COOKIE_SECRET: { type: "plain_text", value: "invalid" },
    },
  });
  await worker.ready;
  assert.equal(
    (await check("/en/learn", 503)).headers.get("content-language"),
    "en",
  );
  await check("/auth/status", 503);
  console.log(
    "Pilot Worker passed DE/EN, auth method, asset and fail-closed checks.",
  );
} finally {
  await worker.dispose();
}
