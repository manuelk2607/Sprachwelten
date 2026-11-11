import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { worldsPilotOrigin } from "../lib/worlds-pilot.ts";

async function check(path: string, status: number) {
  const response = await fetch(worldsPilotOrigin + path, {
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

// Allow time for workers.dev to start routing to a newly enabled worker.
for (let attempt = 0; ; attempt++) {
  try {
    const robots = await check("/robots.txt", 200);
    assert.match(await robots.text(), /Disallow: \/\n/);
    break;
  } catch (error) {
    if (attempt >= 7) throw error;
    await delay(7_500);
  }
}

await check("/sitemap.xml", 404);
await check("/favicon.svg", 200);
assert.match(await (await check("/lernen", 200)).text(), /<html[^>]+lang="de"/);
assert.match(
  await (await check("/en/learn", 200)).text(),
  /<html[^>]+lang="en"/,
);
assert.deepEqual(await (await check("/auth/status", 200)).json(), {
  user: null,
  source: "anonymous",
});
await check("/auth/worlds/recovery", 401);
console.log(
  "Live pilot passed DE/EN, index protection and database-backed anonymous auth checks.",
);
