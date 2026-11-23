import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { eq } from "void/db";
import { entries, noteImages } from "../db/schema.ts";
import { pageUpdateFromEditForm } from "../domain/edit-page.ts";
import { acceptNoteImage, noteImageIsPublic } from "../domain/note-image.ts";
import type { NoteImageBytes } from "../domain/note-image.ts";
import type { EntryImageObjects } from "../store/entry-images.ts";
import { commitEntry, readStoredEntry } from "../store/entries.ts";
import { listArticlesForEdit } from "../store/edit-article.ts";
import { updatePageFromEdit } from "../store/edit-page.ts";

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

test("a page form refuses an empty title or an empty body", () => {
  assert.deepEqual(pageUpdateFromEditForm({ title: "  ", body: "kept" }), { error: "missing_title" });
  assert.deepEqual(pageUpdateFromEditForm({ title: "Title", body: "" }), { error: "empty_body" });
  assert.deepEqual(pageUpdateFromEditForm({ title: "Title", body: " " }), { title: "Title", body: " " });
});

test("saving a page replaces the title and body and leaves the import record", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-23T04:00:00.000Z";
  await commitEntry(database, {
    id: "page-1",
    kind: "page",
    title: "Old title",
    body: "imported",
    visibility: "public",
    publishedAt: null,
    cosensePageId: "cosense-1",
    lastImportedBody: "imported",
    sourceUpdatedAt: 100,
    createdAt: now,
    updatedAt: now,
    viewPath: "Old_title",
  });
  await commitEntry(database, {
    id: "article-1",
    kind: "article",
    title: "Article",
    body: "article",
    visibility: "public",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    viewPath: "Article",
  });

  const saved = await updatePageFromEdit(
    database,
    "page-1",
    { title: "New title", body: "local edit" },
    "2026-11-23T05:00:00.000Z",
  );
  assert.equal("entry" in saved, true);
  if (!("entry" in saved)) return;
  assert.equal(saved.entry.kind, "page");
  assert.equal(saved.entry.visibility, "public");
  assert.equal(saved.entry.title, "New title");
  assert.equal(saved.entry.body, "local edit");
  assert.equal(saved.entry.publishedAt, null);

  const row = (await database.select().from(entries).where(eq(entries.id, "page-1")))[0];
  assert.equal(row?.viewPath, "New_title");
  assert.equal(row?.cosensePageId, "cosense-1");
  assert.equal(row?.lastImportedBody, "imported");
  assert.equal(row?.sourceUpdatedAt, 100);
  assert.equal(row?.publishedAt, null);
  assert.deepEqual(
    (await listArticlesForEdit(database)).map((article) => article.id),
    ["article-1"],
  );

  const refused = await updatePageFromEdit(database, "page-1", { title: "New title", body: "" });
  assert.deepEqual(refused, { error: "empty_body" });
  assert.equal((await readStoredEntry(database, "page-1"))?.body, "local edit");
  assert.deepEqual(await updatePageFromEdit(database, "article-1", { title: "Article", body: "x" }), {
    error: "not_found",
  });
  assert.equal(noteImageIsPublic({ kind: "page", visibility: "public" }, "image/png"), true);
  assert.equal(noteImageIsPublic({ kind: "page", visibility: "draft" }, "image/png"), false);
  sqlite.close();
});

test("a page can store an image without listing it as a note image under another kind", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-23T04:00:00.000Z";
  await commitEntry(database, {
    id: "page-1",
    kind: "page",
    title: "With image",
    body: "before",
    visibility: "public",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    viewPath: "With_image",
  });
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const imageId = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
  const savedBytes = new Map<string, NoteImageBytes>();
  const objects: EntryImageObjects = {
    async put(id, image) {
      savedBytes.set(id, image);
    },
    async delete(id) {
      savedBytes.delete(id);
    },
  };
  const accepted = acceptNoteImage(png);
  assert.equal("image" in accepted, true);
  if (!("image" in accepted)) return;
  const saved = await updatePageFromEdit(
    database,
    "page-1",
    { title: "With image", body: `![alt](/note-images/${imageId})` },
    "2026-11-23T05:00:00.000Z",
    [{ id: imageId, alt: "alt", image: accepted.image }],
    objects,
  );
  assert.equal("entry" in saved, true);
  const rows = await database.select().from(noteImages).where(eq(noteImages.entryId, "page-1"));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.altText, "alt");
  assert.equal(savedBytes.has(imageId), true);
  sqlite.close();
});
