import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { readStoredEntry } from "../store/entries.ts";
import { submitArticleFromEdit } from "../store/edit-article.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function readRoot(path: string) {
  return readFileSync(join(rootDir, path), "utf8");
}

function applyShippedMigrations() {
  const directory = join(rootDir, "db/migrations");
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.equal(files.length > 0, true);
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

const title = "Markdown morning";
const markdown = [
  "# Heading",
  "",
  "- item",
  "- another item",
  "",
  "[example](https://example.com/path)",
  "",
  "```",
  "const value = 1;",
  "```",
  "",
].join("\n");

test("the edit create submit stores markdown as an article body", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const saved = await submitArticleFromEdit(database, { title, body: markdown });
  assert.equal(saved.kind, "article");
  assert.equal(saved.title, title);
  assert.equal(saved.body, markdown);
  assert.equal(saved.body.includes("<h1>"), false);
  assert.equal(saved.body.includes("<li>"), false);
  assert.equal(saved.body.includes("<a"), false);
  assert.equal(saved.body.includes("<pre"), false);
  assert.equal(saved.body.includes("<code"), false);

  const again = await readStoredEntry(database, saved.id);
  assert.ok(again);
  assert.equal(again.kind, "article");
  assert.equal(again.title, title);
  assert.equal(again.body, markdown);
  sqlite.close();
});

test("the create form posts the markdown body to the article submit", () => {
  const page = readRoot("pages/edit/index.svelte");
  const form = page.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/);
  assert.ok(form);
  const attrs = form[1] ?? "";
  const inner = form[2] ?? "";
  assert.match(attrs, /\bmethod\s*=\s*["']post["']/);
  const textarea = inner.match(/<textarea\b[^>]*>/);
  assert.ok(textarea);
  assert.match(textarea[0], /\bname\s*=\s*["']body["']/);
  assert.equal(/\bdisabled\b/.test(textarea[0]), false);
  const submit = inner.match(/<button\b[^>]*>/);
  assert.ok(submit);
  assert.match(submit[0], /\btype\s*=\s*["']submit["']/);

  const server = readRoot("pages/edit/index.server.ts");
  assert.equal(server.includes("void/db"), false);
  assert.match(server, /parseBody\s*\(/);
  assert.match(
    server,
    /submitArticleFromEdit\([\s\S]*title:\s*postedText\(\s*posted\.title\s*\)[\s\S]*body:\s*postedText\(\s*posted\.body\s*\)/,
  );
});
