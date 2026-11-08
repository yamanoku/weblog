import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { noteFromEditField, postedNoteUrl } from "../domain/edit-note.ts";
import { listDeliverableEntries, readStoredEntry } from "../store/entries.ts";
import { listArticlesForEdit } from "../store/edit-article.ts";
import { submitNoteFromEdit } from "../store/edit-note.ts";

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

test("the edit screen posts the note field separately from the article form", () => {
  const page = readFileSync(join(rootDir, "pages/edit/index.svelte"), "utf8");
  assert.match(page, /Post a note/);
  assert.match(page, /useForm\(\s*"\/edit\?note"/);
  assert.match(page, /name="noteBody"/);
  assert.match(page, /postedNote\.canonicalUrl/);
  assert.match(page, /noteForm\.errors\.noteBody/);
  const server = readFileSync(join(rootDir, "pages/edit/index.server.ts"), "utf8");
  assert.match(server, /actions\s*=\s*\{/);
  assert.match(server, /submitNoteFromEdit\(/);
  assert.match(server, /postedText\(\s*posted\.noteBody\s*\)/);
  assert.match(server, /ValidationError\(\{\s*noteBody:\s*result\.error\s*\}\)/);
  assert.match(server, /redirect\(`\/edit\?posted=\$\{result\.id\}`\)/);
  assert.match(server, /postedNoteUrl\(/);
  assert.equal(server.includes("void/db"), false);
});
