import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { addEntry } from "../db/repository";
import { adminEntries } from "../db/admin-repository";
import {
  inbox,
  inboxCount,
  markInboxEntrySeen,
  markInboxSeen,
} from "../db/community-repository";
import { entryInput } from "../lib/content";
import { GameError } from "../lib/game";

const host = process.env.TEST_DATABASE_HOST;
assert.ok(host, "TEST_DATABASE_HOST must identify an isolated test database.");
assert.equal(new URL(process.env.DATABASE_URL_UNPOOLED!).hostname, host);
assert.equal(
  new URL(process.env.DATABASE_URL!).hostname.replace("-pooler.", "."),
  host,
  "Repository and cleanup must use the same isolated test database.",
);
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
// These UUIDs are read-state fixtures only. No account or admin grant is created.
const readers = [crypto.randomUUID(), crypto.randomUUID()];
const ids: string[] = [];
const prefix = "QA-inbox-" + crypto.randomUUID();
async function create() {
  const entry = await addEntry(
    entryInput.parse({
      kind: "word",
      phrase: prefix + "-" + ids.length,
      language: "en",
      literal: "QA inbox translation",
    }),
    "qa-inbox",
    "",
  );
  ids.push(entry.id);
  return entry;
}
async function unread(reader: string, id: string) {
  const feed = await inbox(reader);
  return feed.events.find((entry) => entry.id === id)?.unread;
}

try {
  const first = await create(),
    second = await create();
  const before = await inbox(readers[0]);
  const badgeBefore = await inboxCount(readers[0]);
  assert.equal(await unread(readers[0], first.id), true);
  await Promise.all([
    markInboxEntrySeen(readers[0], first.id),
    markInboxEntrySeen(readers[0], first.id),
  ]);
  assert.equal(await unread(readers[0], first.id), false);
  assert.equal(await unread(readers[0], second.id), true);
  assert.equal(await unread(readers[1], first.id), true);
  assert.deepEqual(
    (await adminEntries(prefix, false, 0, readers[0])).entries.map(
      (entry) => entry.id,
    ),
    [second.id],
  );
  assert.equal(
    (await adminEntries(prefix, false, 0, readers[1])).entries.length,
    2,
  );
  assert.equal((await adminEntries(prefix, false, 0)).entries.length, 2);
  assert.equal(
    (await adminEntries(first.phrase, false, 0, readers[0])).entries.length,
    0,
  );
  assert.equal((await inbox(readers[0])).unreadCount, before.unreadCount - 1);
  assert.equal(await inboxCount(readers[0]), badgeBefore - 1);
  const [read] =
    await sql`SELECT count(*)::int AS total FROM admin_inbox_reads WHERE user_id=${readers[0]} AND entry_id=${first.id}`;
  assert.equal(read.total, 1, "Concurrent/repeated reads are idempotent.");

  await assert.rejects(
    markInboxEntrySeen(readers[0], crypto.randomUUID()),
    (error) => error instanceof GameError && error.status === 404,
  );
  await sql`UPDATE content_entries SET deleted_at=now() WHERE id=${second.id}`;
  await assert.rejects(
    markInboxEntrySeen(readers[0], second.id),
    (error) => error instanceof GameError && error.status === 404,
  );
  assert.equal(
    (await adminEntries(prefix, false, 0, readers[0])).entries.length,
    0,
  );
  assert.equal(
    (await adminEntries(prefix, true, 0, readers[0])).entries.length,
    0,
  );
  await sql`UPDATE content_entries SET deleted_at=NULL WHERE id=${second.id}`;

  await markInboxSeen(readers[0]);
  assert.equal((await inbox(readers[0])).unreadCount, 0);
  assert.equal(
    (await adminEntries(prefix, false, 0, readers[0])).entries.length,
    0,
  );
  assert.equal(await unread(readers[1], first.id), true);
  const later = await create();
  assert.equal(await unread(readers[0], later.id), true);
  assert.equal((await inbox(readers[0])).unreadCount, 1);
  assert.deepEqual(
    (await adminEntries(prefix, false, 0, readers[0])).entries.map(
      (entry) => entry.id,
    ),
    [later.id],
  );
  await markInboxEntrySeen(readers[0], later.id);
  const after = await inbox(readers[0]);
  assert.equal(after.unreadCount, 0);
  assert.equal(await inboxCount(readers[0]), after.pendingSuggestions);

  const pageEntries = [];
  for (let i = 0; i < 32; i++) pageEntries.push(await create());
  const firstPage = await adminEntries(prefix, false, 0, readers[0]);
  const lastPage = await adminEntries(prefix, false, 30, readers[0]);
  assert.equal(firstPage.entries.length, 30);
  assert.equal(firstPage.more, true);
  assert.equal(lastPage.entries.length, 2);
  assert.equal(lastPage.more, false);
  assert.equal(
    new Set(
      [...firstPage.entries, ...lastPage.entries].map((entry) => entry.id),
    ).size,
    32,
  );
  for (const entry of pageEntries.slice(2))
    await markInboxEntrySeen(readers[0], entry.id);
  const olderUnread = await adminEntries(prefix, false, 0, readers[0]);
  assert.deepEqual(
    new Set(olderUnread.entries.map((entry) => entry.id)),
    new Set(pageEntries.slice(0, 2).map((entry) => entry.id)),
  );
  assert.equal(
    olderUnread.more,
    false,
    "Filter unread entries before pagination, including older pages.",
  );

  await sql`DELETE FROM content_entries WHERE id=${first.id}`;
  const [remaining] =
    await sql`SELECT count(*)::int AS total FROM admin_inbox_reads WHERE entry_id=${first.id}`;
  assert.equal(
    remaining.total,
    0,
    "Removing an entry cleans up its read state.",
  );
  console.log(
    "PASS: individual and concurrent reads, account isolation, counts, unread filtering with search/pagination and bulk-read compatibility, missing/removed entries, later contributions and cascading cleanup.",
  );
} finally {
  for (const reader of readers) {
    await sql`DELETE FROM admin_inbox_reads WHERE user_id=${reader}`;
    await sql`DELETE FROM admin_inbox_seen WHERE user_id=${reader}`;
  }
  for (const id of ids) await sql`DELETE FROM content_entries WHERE id=${id}`;
}
