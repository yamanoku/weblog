import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { eq } from "void/db";
import { deliveryRecords, edges, entries, tombstones } from "../db/schema.ts";
import { bookmarkDeleteId, bookmarkFromEditForm } from "../domain/edit-bookmark.ts";
import { commitEntry, hasTombstone, readStoredEntry } from "../store/entries.ts";
import { listArticlesForEdit } from "../store/edit-article.ts";
import {
  deleteBookmarkFromEdit,
  listBookmarksForEdit,
  submitBookmarkFromEdit,
  updateBookmarkFromEdit,
} from "../store/edit-bookmark.ts";
import { listNotesForEdit } from "../store/edit-note.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function applyShippedMigrations() {
  const directory = join(rootDir, "db/migrations");
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const sqlite = new Database(":memory:");
  for (const name of files) {
    const statements = readFileSync(join(directory, name), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    for (const statement of statements) sqlite.exec(statement);
  }
  return sqlite;
}

test("a bookmark form refuses an empty title or a missing URL", () => {
  assert.deepEqual(bookmarkFromEditForm({ title: "  ", body: "c", bookmarkUrl: "https://example.com" }), {
    error: "missing_title",
  });
  assert.deepEqual(bookmarkFromEditForm({ title: "Clip", body: "c", bookmarkUrl: "  " }), {
    error: "missing_bookmark_url",
  });
  assert.deepEqual(bookmarkDeleteId({}), { error: "not_found" });
  assert.deepEqual(bookmarkDeleteId({ bookmarkId: "abc" }), { id: "abc" });
});

test("the bookmark form stores a draft and leaves articles and notes out of that list", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const refused = await submitBookmarkFromEdit(database, {
    title: "",
    body: "comment",
    bookmarkUrl: "https://example.com/a",
  });
  assert.deepEqual(refused, { error: "missing_title" });
  const missingUrl = await submitBookmarkFromEdit(database, {
    title: "Clip",
    body: "comment",
    bookmarkUrl: "",
  });
  assert.deepEqual(missingUrl, { error: "missing_bookmark_url" });
  assert.equal((await listBookmarksForEdit(database)).length, 0);

  const saved = await submitBookmarkFromEdit(database, {
    title: "Clip",
    body: "a comment",
    bookmarkUrl: "  https://example.com/a  ",
  });
  assert.ok(!("error" in saved));
  const entry = await readStoredEntry(database, saved.id);
  assert.ok(entry);
  assert.equal(entry.kind, "bookmark");
  assert.equal(entry.title, "Clip");
  assert.equal(entry.body, "a comment");
  assert.equal(entry.body.includes("https://example.com/a"), false);
  assert.equal(entry.bookmarkUrl, "https://example.com/a");
  assert.equal(entry.visibility, "draft");
  assert.equal(entry.publishedAt, null);
  assert.equal((await listArticlesForEdit(database)).length, 0);
  assert.equal((await listNotesForEdit(database)).length, 0);
  const listed = await listBookmarksForEdit(database);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, saved.id);
  sqlite.close();
});

test("the edit screen lists bookmarks and updates only that bookmark", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-08T00:00:00.000Z";
  await commitEntry(database, {
    id: "bookmark-old",
    kind: "bookmark",
    title: "Older",
    body: "old comment",
    visibility: "draft",
    bookmarkUrl: "https://example.com/old",
    createdAt: now,
    updatedAt: "2026-11-08T00:00:00.000Z",
  });
  await commitEntry(database, {
    id: "bookmark-new",
    kind: "bookmark",
    title: "Newer",
    body: "new comment",
    visibility: "public",
    bookmarkUrl: "https://example.com/new",
    publishedAt: "2026-11-08T01:00:00.000Z",
    createdAt: now,
    updatedAt: "2026-11-08T01:00:00.000Z",
  });
  await commitEntry(database, {
    id: "article-1",
    kind: "article",
    title: "Keep",
    body: "article",
    visibility: "draft",
    createdAt: now,
    updatedAt: now,
  });
  await commitEntry(database, {
    id: "note-1",
    kind: "note",
    title: "",
    body: "note",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
  });

  const listed = await listBookmarksForEdit(database);
  assert.deepEqual(
    listed.map((bookmark) => bookmark.id),
    ["bookmark-new", "bookmark-old"],
  );
  assert.equal(listed[0]?.bookmarkUrl, "https://example.com/new");
  assert.equal((await listArticlesForEdit(database)).length, 1);
  assert.equal((await listNotesForEdit(database)).length, 1);

  const publishedEmpty = await updateBookmarkFromEdit(
    database,
    "bookmark-new",
    { title: "Newer", body: "", visibility: "public", bookmarkUrl: "https://example.com/new" },
    "2026-11-08T03:00:00.000Z",
  );
  assert.equal("entry" in publishedEmpty, true);
  if (!("entry" in publishedEmpty)) return;
  assert.equal(publishedEmpty.entry.visibility, "public");
  assert.equal(publishedEmpty.entry.body, "");
  assert.equal(publishedEmpty.entry.bookmarkUrl, "https://example.com/new");
  assert.equal(publishedEmpty.entry.publishedAt, "2026-11-08T01:00:00.000Z");

  const published = await updateBookmarkFromEdit(
    database,
    "bookmark-old",
    {
      title: "Renamed clip",
      body: "kept comment",
      visibility: "public",
      bookmarkUrl: "https://example.com/renamed",
    },
    "2026-11-08T03:00:00.000Z",
  );
  assert.equal("entry" in published, true);
  if (!("entry" in published)) return;
  assert.equal(published.entry.kind, "bookmark");
  assert.equal(published.entry.title, "Renamed clip");
  assert.equal(published.entry.body, "kept comment");
  assert.equal(published.entry.body.includes("https://example.com/renamed"), false);
  assert.equal(published.entry.bookmarkUrl, "https://example.com/renamed");
  assert.equal(published.entry.publishedAt, "2026-11-08T03:00:00.000Z");
  const row = await database.select().from(entries).where(eq(entries.id, "bookmark-old"));
  assert.equal(row[0]?.viewPath, "Renamed_clip");

  const again = await updateBookmarkFromEdit(
    database,
    "bookmark-old",
    {
      title: "Renamed clip",
      body: "kept comment",
      visibility: "public",
      bookmarkUrl: "https://example.com/renamed",
    },
    "2026-11-08T04:00:00.000Z",
  );
  assert.equal("entry" in again && again.entry.publishedAt, "2026-11-08T03:00:00.000Z");

  const missed = await updateBookmarkFromEdit(database, "article-1", {
    title: "Keep",
    body: "article",
    visibility: "public",
    bookmarkUrl: "https://example.com/nope",
  });
  assert.deepEqual(missed, { error: "not_found" });
  assert.equal((await readStoredEntry(database, "article-1"))?.kind, "article");
  sqlite.close();
});

test("deleting a bookmark removes only that bookmark", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-08T00:00:00.000Z";
  await commitEntry(database, {
    id: "bookmark-old",
    kind: "bookmark",
    title: "Older",
    body: "old comment",
    visibility: "draft",
    bookmarkUrl: "https://example.com/old",
    createdAt: now,
    updatedAt: now,
  });
  await commitEntry(database, {
    id: "bookmark-new",
    kind: "bookmark",
    title: "Newer",
    body: "new comment",
    visibility: "public",
    bookmarkUrl: "https://example.com/new",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await commitEntry(database, {
    id: "article-1",
    kind: "article",
    title: "Keep",
    body: "article",
    visibility: "draft",
    createdAt: now,
    updatedAt: now,
  });
  await commitEntry(database, {
    id: "note-1",
    kind: "note",
    title: "",
    body: "note",
    visibility: "public",
    createdAt: now,
    updatedAt: now,
  });
  await database.insert(edges).values({ sourceId: "bookmark-new", writtenTitle: "Luma", targetId: null });
  await database.insert(deliveryRecords).values({ entryId: "bookmark-new" });

  assert.deepEqual(await deleteBookmarkFromEdit(database, "article-1"), { error: "not_found" });
  assert.deepEqual(await deleteBookmarkFromEdit(database, "note-1"), { error: "not_found" });
  assert.equal((await readStoredEntry(database, "article-1"))?.kind, "article");
  assert.equal((await readStoredEntry(database, "note-1"))?.kind, "note");

  assert.deepEqual(await deleteBookmarkFromEdit(database, "bookmark-old"), { ok: true });
  assert.equal(await readStoredEntry(database, "bookmark-old"), null);
  assert.equal(await hasTombstone(database, "bookmark-old"), false);

  assert.deepEqual(
    await deleteBookmarkFromEdit(database, "bookmark-new", "2026-11-08T02:00:00.000Z"),
    { ok: true },
  );
  assert.equal(await readStoredEntry(database, "bookmark-new"), null);
  assert.equal(await hasTombstone(database, "bookmark-new"), true);
  const record = await database
    .select()
    .from(deliveryRecords)
    .where(eq(deliveryRecords.entryId, "bookmark-new"));
  assert.equal(record.length, 1);
  const edge = await database.select().from(edges).where(eq(edges.sourceId, "bookmark-new"));
  assert.equal(edge.length, 0);
  const stone = await database.select().from(tombstones).where(eq(tombstones.entryId, "bookmark-new"));
  assert.equal(stone[0]?.deletedAt, "2026-11-08T02:00:00.000Z");
  assert.equal((await listBookmarksForEdit(database)).length, 0);
  sqlite.close();
});

test("the edit screen posts a bookmark form and opens bookmark edit", () => {
  const page = readFileSync(join(rootDir, "pages/edit/index.svelte"), "utf8");
  assert.match(page, /action="\?bookmark"/);
  assert.match(page, /name="bookmarkUrl"/);
  assert.match(page, /Save bookmark/);
  assert.match(page, /<h2>Bookmarks<\/h2>/);
  assert.match(page, /action="\?deleteBookmark"/);
  assert.match(page, /name="bookmarkId"/);
  assert.match(page, /href=\{"\/edit\/" \+ bookmark\.id\}/);
  const server = readFileSync(join(rootDir, "pages/edit/index.server.ts"), "utf8");
  assert.match(server, /submitBookmarkFromEdit\(/);
  assert.match(server, /listBookmarksForEdit\(/);
  assert.match(server, /deleteBookmarkFromEdit\(/);
  assert.match(server, /bookmark:/);
  assert.match(server, /deleteBookmark:/);
  assert.equal(server.includes("void/db"), false);

  const edit = readFileSync(join(rootDir, "pages/edit/[id].svelte"), "utf8");
  assert.match(edit, /entry\.kind === "bookmark"/);
  assert.match(edit, /name="bookmarkUrl"/);
  assert.equal(edit.includes("{@html"), false);
  const editServer = readFileSync(join(rootDir, "pages/edit/[id].server.ts"), "utf8");
  assert.match(editServer, /updateBookmarkFromEdit\(/);
  assert.match(editServer, /updateArticleFromEdit\(/);
  assert.equal(editServer.includes("void/db"), false);
});
