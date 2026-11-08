import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { noteBodyField, noteDeleteId, noteFromEditField, postedNoteUrl } from "../domain/edit-note.ts";
import { deliveryRecords, edges, entries, tombstones } from "../db/schema.ts";
import { eq } from "void/db";
import { commitEntry, hasTombstone, listDeliverableEntries, readStoredEntry } from "../store/entries.ts";
import { listArticlesForEdit } from "../store/edit-article.ts";
import { deleteNoteFromEdit, listNotesForEdit, submitNoteFromEdit } from "../store/edit-note.ts";

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

test("an empty note field is refused and whitespace is kept", () => {
  assert.deepEqual(noteFromEditField(""), { error: "empty_body" });
  assert.deepEqual(noteFromEditField("  "), { body: "  " });
  assert.equal(noteBodyField({ noteBody: "morning" }), "morning");
  assert.equal(noteBodyField({ noteBody: "  " }), "  ");
  assert.equal(noteBodyField({}), "");
  assert.equal(noteBodyField(null), "");
  assert.deepEqual(noteDeleteId({ noteId: "abc" }), { id: "abc" });
  assert.deepEqual(noteDeleteId({}), { error: "not_found" });
  assert.deepEqual(noteDeleteId({ noteId: "" }), { error: "not_found" });
  assert.equal(postedNoteUrl(null), null);
  assert.equal(postedNoteUrl({ id: "x", kind: "article", visibility: "public" }), null);
  assert.equal(postedNoteUrl({ id: "x", kind: "note", visibility: "draft" }), null);
  assert.deepEqual(postedNoteUrl({ id: "abc", kind: "note", visibility: "public" }), {
    canonicalUrl: "https://weblog.yamanoku.net/e/abc",
  });
});

test("the note field stores a public note and leaves the article list unchanged", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const refused = await submitNoteFromEdit(database, "");
  assert.deepEqual(refused, { error: "empty_body" });
  assert.equal((await listDeliverableEntries(database)).length, 0);

  const saved = await submitNoteFromEdit(database, "morning");
  assert.ok(!("error" in saved));
  const entry = await readStoredEntry(database, saved.id);
  assert.ok(entry);
  assert.equal(entry.kind, "note");
  assert.equal(entry.title, "");
  assert.equal(entry.body, "morning");
  assert.equal(entry.visibility, "public");
  assert.equal(typeof entry.publishedAt, "string");
  assert.equal((await listArticlesForEdit(database)).length, 0);
  const listed = await listDeliverableEntries(database);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, saved.id);
  assert.equal(listed[0]?.body, "morning");
  sqlite.close();
});

test("the edit screen lists notes and deletes only that note", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-08T00:00:00.000Z";
  await commitEntry(database, {
    id: "note-old",
    kind: "note",
    title: "",
    body: "older",
    visibility: "draft",
    createdAt: now,
    updatedAt: "2026-11-08T00:00:00.000Z",
  });
  await commitEntry(database, {
    id: "note-new",
    kind: "note",
    title: "",
    body: "newer",
    visibility: "public",
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
  await database.insert(edges).values({ sourceId: "note-new", writtenTitle: "Luma", targetId: null });
  const listed = await listNotesForEdit(database);
  assert.deepEqual(
    listed.map((note) => note.id),
    ["note-new", "note-old"],
  );
  assert.equal(listed[0]?.body, "newer");
  assert.equal((await listArticlesForEdit(database)).length, 1);

  const missed = await deleteNoteFromEdit(database, "article-1");
  assert.deepEqual(missed, { error: "not_found" });
  assert.equal((await readStoredEntry(database, "article-1"))?.kind, "article");

  const removed = await deleteNoteFromEdit(database, "note-old");
  assert.deepEqual(removed, { ok: true });
  assert.equal(await readStoredEntry(database, "note-old"), null);
  assert.equal(await hasTombstone(database, "note-old"), false);

  await database.insert(deliveryRecords).values({ entryId: "note-new" });
  const delivered = await deleteNoteFromEdit(database, "note-new", "2026-11-08T02:00:00.000Z");
  assert.deepEqual(delivered, { ok: true });
  assert.equal(await readStoredEntry(database, "note-new"), null);
  assert.equal(await hasTombstone(database, "note-new"), true);
  const record = await database.select().from(deliveryRecords).where(eq(deliveryRecords.entryId, "note-new"));
  assert.equal(record.length, 1);
  const edge = await database.select().from(edges).where(eq(edges.sourceId, "note-new"));
  assert.equal(edge.length, 0);
  const stone = await database.select().from(tombstones).where(eq(tombstones.entryId, "note-new"));
  assert.equal(stone[0]?.deletedAt, "2026-11-08T02:00:00.000Z");
  assert.equal((await listNotesForEdit(database)).length, 0);
  assert.equal((await database.select().from(entries).where(eq(entries.id, "article-1"))).length, 1);
  sqlite.close();
});

test("the home page shows the note field to the owner and the edit screen keeps the list", () => {
  const home = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  assert.match(home, /\{#if owner\}/);
  assert.match(home, /Post a note/);
  assert.match(home, /useForm\(\s*"\/edit\?note"/);
  assert.match(home, /name="noteBody"/);
  assert.match(home, /postedNote\.canonicalUrl/);
  assert.equal(home.includes("noteForm.errors.noteBody"), false);
  const homeServer = readFileSync(join(rootDir, "pages/index.server.ts"), "utf8");
  assert.match(homeServer, /verifiedOwner\(/);
  assert.match(homeServer, /readsDevCatalog\(\)/);
  assert.match(homeServer, /private, no-store/);
  assert.match(homeServer, /postedNoteUrl\(/);
  const page = readFileSync(join(rootDir, "pages/edit/index.svelte"), "utf8");
  assert.equal(page.includes("Post a note"), false);
  assert.equal(page.includes("noteBody"), false);
  assert.match(page, /<h2>Notes<\/h2>/);
  assert.match(page, /action="\?deleteNote"/);
  assert.match(page, /name="noteId"/);
  assert.equal(page.includes('"/edit/" + note.id'), false);
  const server = readFileSync(join(rootDir, "pages/edit/index.server.ts"), "utf8");
  assert.match(server, /actions\s*=\s*\{/);
  assert.match(server, /submitNoteFromEdit\(/);
  assert.match(server, /application\/json/);
  assert.match(server, /c\.req\.json\(\)/);
  assert.match(server, /noteBodyField\(payload\)/);
  assert.match(server, /listNotesForEdit\(/);
  assert.match(server, /deleteNoteFromEdit\(/);
  assert.match(server, /deleteNote:/);
  assert.match(server, /ValidationError\(\{\s*noteBody:\s*result\.error\s*\}\)/);
  assert.match(server, /redirect\(`\/\?posted=\$\{result\.id\}`\)/);
  assert.equal(server.includes("postedNoteUrl"), false);
  assert.equal(server.includes("void/db"), false);
});
