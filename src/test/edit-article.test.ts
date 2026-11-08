import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { publicArticleFields } from "../domain/edit-article.ts";
import { publicArticleHref, publicEntryHref, publicArticleMatchesPath } from "../domain/public-article.ts";
import {
  commitEntry,
  listDeliverableEntries,
  listPublicTitles,
  readPublicEntryByPath,
  readStoredEntry,
} from "../store/entries.ts";
import {
  listArticlesForEdit,
  listPublicArticles,
  submitArticleFromEdit,
  updateArticleFromEdit,
} from "../store/edit-article.ts";

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
  assert.match(server, /listArticlesForEdit\(/);
  assert.match(page, /href=\{"\/edit\/" \+ article\.id\}/);
  assert.match(page, /article\.visibility/);
});

test("the edit screen lists draft and public articles, newest first", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  await commitEntry(database, {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    kind: "article",
    title: "Older draft",
    body: "draft body",
    visibility: "draft",
    createdAt: "2026-11-07T00:00:00.000Z",
    updatedAt: "2026-11-07T00:00:00.000Z",
  });
  await commitEntry(database, {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    kind: "note",
    title: "A note",
    body: "note body",
    visibility: "draft",
    createdAt: "2026-11-07T03:00:00.000Z",
    updatedAt: "2026-11-07T03:00:00.000Z",
  });
  await commitEntry(database, {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    kind: "article",
    title: "Newer public",
    body: "public body",
    visibility: "public",
    publishedAt: "2026-11-07T02:00:00.000Z",
    createdAt: "2026-11-07T01:00:00.000Z",
    updatedAt: "2026-11-07T02:00:00.000Z",
  });

  const articles = await listArticlesForEdit(database);
  assert.deepEqual(
    articles.map((article) => article.title),
    ["Newer public", "Older draft"],
  );
  assert.deepEqual(
    articles.map((article) => article.visibility),
    ["public", "draft"],
  );
  sqlite.close();
});

test("publishing an article keeps the markdown and records publishedAt", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const saved = await submitArticleFromEdit(database, { title, body: markdown });
  const published = await updateArticleFromEdit(
    database,
    saved.id,
    { title, body: markdown, visibility: "public" },
    "2026-11-07T04:00:00.000Z",
  );
  assert.equal("entry" in published, true);
  if (!("entry" in published)) return;
  assert.equal(published.entry.kind, "article");
  assert.equal(published.entry.visibility, "public");
  assert.equal(published.entry.body, markdown);
  assert.equal(published.entry.publishedAt, "2026-11-07T04:00:00.000Z");
  assert.equal(publicArticleFields(published.entry)?.body, markdown);

  const again = await updateArticleFromEdit(
    database,
    saved.id,
    { title: "Renamed", body: markdown, visibility: "public" },
    "2026-11-07T05:00:00.000Z",
  );
  assert.equal("entry" in again, true);
  if (!("entry" in again)) return;
  assert.equal(again.entry.publishedAt, "2026-11-07T04:00:00.000Z");
  assert.equal(again.entry.title, "Renamed");

  const refused = await updateArticleFromEdit(
    database,
    saved.id,
    { title, body: "", visibility: "public" },
    "2026-11-07T06:00:00.000Z",
  );
  assert.deepEqual(refused, { error: "empty_body" });
  const kept = await readStoredEntry(database, saved.id);
  assert.equal(kept?.title, "Renamed");
  assert.equal(kept?.body, markdown);
  assert.equal(publicArticleFields({ ...published.entry, visibility: "draft" }), null);
  sqlite.close();
});

test("public articles are listed for the home page and matched by the title path", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  await commitEntry(database, {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
    kind: "article",
    title: "Hidden draft",
    body: "secret",
    visibility: "draft",
    createdAt: "2026-11-07T01:00:00.000Z",
    updatedAt: "2026-11-07T01:00:00.000Z",
  });
  await commitEntry(database, {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5",
    kind: "article",
    title: "Older public",
    body: "older body",
    visibility: "public",
    publishedAt: "2026-11-07T02:00:00.000Z",
    createdAt: "2026-11-07T02:00:00.000Z",
    updatedAt: "2026-11-07T02:00:00.000Z",
  });
  const saved = await submitArticleFromEdit(database, {
    title: "Spaced title",
    body: markdown,
  });
  const published = await updateArticleFromEdit(
    database,
    saved.id,
    { title: "Spaced title", body: markdown, visibility: "public" },
    "2026-11-07T03:00:00.000Z",
  );
  assert.equal("entry" in published, true);

  const articles = await listPublicArticles(database);
  assert.deepEqual(
    articles.map((article) => article.title),
    ["Spaced title", "Older public"],
  );
  assert.equal(articles.some((article) => article.title === "Hidden draft"), false);
  assert.equal(publicArticleMatchesPath("Spaced title", "Spaced_title"), true);
  assert.equal(publicArticleMatchesPath("Spaced title", "Spaced title"), false);
  assert.equal(publicArticleHref({ id: saved.id, title: "Spaced title" }), "/Spaced_title");
  assert.equal(
    publicEntryHref({
      id: "bookmark-1",
      title: "Clip",
      kind: "bookmark",
      bookmarkUrl: "https://example.com/clip",
    }),
    "https://example.com/clip",
  );
  assert.equal(
    publicEntryHref({
      id: "bookmark-2",
      title: "Clip",
      kind: "bookmark",
      bookmarkUrl: "  http://example.com/clip  ",
    }),
    "http://example.com/clip",
  );
  assert.equal(
    publicEntryHref({
      id: "bookmark-3",
      title: "Clip",
      kind: "bookmark",
      bookmarkUrl: "javascript:alert(1)",
    }),
    "/Clip",
  );
  assert.equal(
    publicEntryHref({ id: saved.id, title: "Spaced title", kind: "article" }),
    "/Spaced_title",
  );
  assert.equal(articles[0]?.body, markdown);

  const home = readRoot("pages/index.server.ts");
  const title = readRoot("pages/[title].server.ts");
  assert.equal(home.includes("void/db"), false);
  assert.equal(title.includes("void/db"), false);
  assert.match(home, /readsDevCatalog\(/);
  assert.match(home, /listDeliverableEntries\(/);
  assert.match(home, /deliverableEntries/);
  assert.match(title, /readsDevCatalog\(/);
  assert.match(title, /readPublicEntryByPath\(/);
  assert.match(title, /publicEntryByTitle\(/);
  assert.match(readRoot("pages/index.svelte"), /entry\.href/);
  assert.match(readRoot("pages/[title].svelte"), /entry\.body/);
  sqlite.close();
});

test("the article edit form posts visibility", () => {
  const page = readRoot("pages/edit/[id].svelte");
  const form = page.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/);
  assert.ok(form);
  const inner = form[2] ?? "";
  assert.match(form[1] ?? "", /\bmethod\s*=\s*["']post["']/);
  const visibility = inner.match(/<select\b[^>]*>/);
  assert.ok(visibility);
  assert.match(visibility[0], /\bname\s*=\s*["']visibility["']/);
  assert.match(inner, /value="draft"/);
  assert.match(inner, /value="public"/);
  const submit = inner.match(/<button\b[^>]*>/);
  assert.ok(submit);
  assert.match(submit[0], /\btype\s*=\s*["']submit["']/);

  const server = readRoot("pages/edit/[id].server.ts");
  assert.equal(server.includes("void/db"), false);
  assert.match(server, /parseBody\s*\(/);
  assert.match(server, /visibility:\s*postedText\(\s*posted\.visibility\s*\)/);
  assert.match(server, /updateArticleFromEdit\(/);

  const canonical = readRoot("pages/e/[id].server.ts");
  assert.equal(canonical.includes("void/db"), false);
  assert.match(canonical, /readsDevCatalog\(/);
  assert.match(canonical, /readStoredEntry\(/);
  assert.match(canonical, /visibility === "public"/);
  assert.match(canonical, /hasTombstone\(/);
  assert.match(canonical, /410/);
  assert.match(canonical, /entryById\(/);
});

test("deployed public reads use D1 rows and skip drafts and pages", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const now = "2026-11-07T06:00:00.000Z";
  await commitEntry(database, {
    id: "article-1",
    kind: "article",
    title: "Spaced title",
    body: "Public article",
    visibility: "public",
    publishedAt: "2026-11-07T02:00:00.000Z",
    createdAt: now,
    updatedAt: now,
    viewPath: "Spaced_title",
  });
  await commitEntry(database, {
    id: "note-1",
    kind: "note",
    title: "short-post",
    body: "Public note",
    visibility: "public",
    publishedAt: "2026-11-07T03:00:00.000Z",
    createdAt: now,
    updatedAt: "2026-11-07T03:00:00.000Z",
  });
  await commitEntry(database, {
    id: "page-1",
    kind: "page",
    title: "index-only",
    body: "Public page",
    visibility: "public",
    publishedAt: null,
    createdAt: now,
    updatedAt: "2026-11-07T04:00:00.000Z",
  });
  await commitEntry(database, {
    id: "draft-1",
    kind: "note",
    title: "draft-thought",
    body: "Draft",
    visibility: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const deliverable = await listDeliverableEntries(database);
  assert.deepEqual(
    deliverable.map((entry) => entry.id),
    ["note-1", "article-1"],
  );
  const titles = await listPublicTitles(database);
  assert.deepEqual(
    titles.map((entry) => entry.title),
    ["Spaced title", "index-only", "short-post"],
  );
  const byPath = await readPublicEntryByPath(database, "Spaced_title");
  assert.equal(byPath?.id, "article-1");
  assert.equal(await readPublicEntryByPath(database, "draft-thought"), null);
  sqlite.close();
});
