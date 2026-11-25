import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { asc, eq } from "void/db";
import { noteImages, pathRedirects } from "../db/schema.ts";
import { diaryFromEditForm, publicArticleFields } from "../domain/edit-article.ts";
import { tokyoDateTitle } from "../domain/tokyo-date.ts";
import { entryImageMarkdown, entryImagesFromField } from "../domain/entry-image.ts";
import { acceptNoteImage, encodeNoteImage, noteActivityAttachment, noteImageIsPublic } from "../domain/note-image.ts";
import { entryImageViews, type EntryImageObjects } from "../store/entry-images.ts";
import type { NoteImageBytes } from "../domain/note-image.ts";
import { missingTitleCreateHref, publicAbsoluteHref, publicArticleHref, publicDocumentTitle, publicEntryHref, publicArticleMatchesPath, savedEntryHref } from "../domain/public-article.ts";
import {
  commitEntry,
  listDeliverableEntries,
  listDeliverableEntryPage,
  listHomeEntryPage,
  readPublicEntryByPath,
  readPublicPathRedirect,
  readStoredEntry,
} from "../store/entries.ts";
import {
  listArticlesForEdit,
  listDiariesForEdit,
  submitDiaryFromEdit,
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
  const saved = await submitArticleFromEdit(database, { title, body: markdown, visibility: "public" });
  assert.equal("error" in saved, false);
  if ("error" in saved) return;
  assert.equal(saved.kind, "article");
  assert.equal(saved.visibility, "public");
  assert.equal(saved.viewPath, "Markdown_morning");
  assert.equal(saved.publishedAt !== null, true);
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
  const empty = await submitArticleFromEdit(database, { title: "Empty", body: "", visibility: "public" });
  assert.deepEqual(empty, { error: "empty_body" });
  const weird = await submitArticleFromEdit(database, { title: "Nope", body: "text", visibility: "secret" });
  assert.deepEqual(weird, { error: "invalid_visibility" });
  sqlite.close();
});

test("the create form posts the markdown body to the article submit", () => {
  const page = readRoot("pages/new/index.svelte");
  const form = page.match(/<Form\b([^>]*)>([\s\S]*?)<\/Form>/);
  assert.ok(form);
  const attrs = form[1] ?? "";
  const inner = form[2] ?? "";
  assert.match(page, /useForm\("\/edit"/);
  assert.equal(attrs.includes("bookmark"), false);
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
    /submitArticleFromEdit\([\s\S]*title:\s*postedText\(\s*posted\.title\s*\)[\s\S]*body:\s*postedText\(\s*posted\.body\s*\)[\s\S]*visibility:\s*postedText\(\s*posted\.visibility\s*\)/,
  );
  assert.match(page, /id="article-visibility"/);
  assert.match(page, /id="bookmark-visibility"/);
  assert.match(page, /visibility:\s*"public"/);
  assert.match(page, /visibility:\s*articleForm\.data\.visibility/);
  assert.match(page, /visibility:\s*bookmarkForm\.data\.visibility/);
  assert.match(server, /listArticlesForEdit\(/);
  const list = readRoot("pages/edit/index.svelte");
  assert.equal(list.includes("useForm"), false);
  assert.match(list, /href=\{"\/edit\/" \+ article\.id\}/);
  assert.match(list, /article\.visibility/);
  assert.match(list, /<h2\b[^>]*>Diaries<\/h2>[\s\S]*<h2\b[^>]*>Entries<\/h2>[\s\S]*<h2\b[^>]*>Bookmarks<\/h2>[\s\S]*<h2\b[^>]*>Notes<\/h2>/);
  assert.match(readRoot("pages/edit/index.server.ts"), /submitDiaryFromEdit\(/);
  assert.match(page, /id="create-diary-tab"/);
  assert.match(page, /Save diary/);
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
    updatedAt: "2026-11-07T05:00:00.000Z",
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
  const saved = await submitArticleFromEdit(database, { title, body: markdown, visibility: "draft" });
  assert.equal("error" in saved, false);
  if ("error" in saved) return;
  assert.equal(saved.visibility, "draft");
  assert.equal(saved.publishedAt, null);
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
    visibility: "draft",
  });
  assert.equal("error" in saved, false);
  if ("error" in saved) return;
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
  assert.equal(savedEntryHref({ id: "draft-1", visibility: "draft", viewPath: "Hidden" }), "/e/draft-1");
  assert.equal(savedEntryHref({ id: "pub-1", visibility: "public", viewPath: "Spaced_title" }), "/Spaced_title");
  assert.equal(
    savedEntryHref({ id: "note-1", visibility: "public", viewPath: null }),
    "/e/note-1",
  );
  assert.equal(
    savedEntryHref({ id: "ja-1", visibility: "public", viewPath: "ぼくのなつやすみ" }),
    "/%E3%81%BC%E3%81%8F%E3%81%AE%E3%81%AA%E3%81%A4%E3%82%84%E3%81%99%E3%81%BF",
  );
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
  assert.match(home, /listHomeEntryPage\(/);
  assert.match(home, /homeEntries/);
  assert.match(title, /readsDevCatalog\(/);
  assert.match(title, /readPublicEntryByPath\(/);
  assert.match(title, /readPublicPathRedirect\(/);
  assert.match(title, /301/);
  assert.match(title, /publicEntryByTitle\(/);
  assert.match(readRoot("pages/index.svelte"), /\{entry\.title\}/);
  assert.match(readRoot("pages/index.svelte"), /\/e\/\$\{entry\.id\}/);
  assert.match(readRoot("pages/[title].svelte"), /entry\.body/);
  sqlite.close();
});

test("a missing title page and a note page keep a document title", () => {
  assert.equal(publicDocumentTitle({ title: "朝のメモ", id: "entry-1" }), "朝のメモ - weblog.yamanoku.net");
  assert.equal(publicDocumentTitle({ title: "  ", id: "entry-1" }), "https://weblog.yamanoku.net/e/entry-1");
  assert.equal(publicDocumentTitle(null), "weblog.yamanoku.net");
  for (const path of ["pages/[title].svelte", "pages/e/[id].svelte"]) {
    const page = readRoot(path);
    assert.match(page, /<title>\{headTitle\}<\/title>/);
    assert.equal(/<title>\{entry\.title\}/.test(page), false);
  }
  assert.match(readRoot("pages/[title].server.ts"), /publicDocumentTitle\(null\)/);
  assert.match(readRoot("pages/e/[id].server.ts"), /publicDocumentTitle\(\{ title: stored\.title, id \}\)/);
});

test("a missing title links the owner to a new article with that title", () => {
  assert.equal(
    missingTitleCreateHref("ぼくのなつやすみ"),
    "/new?title=" + encodeURIComponent("ぼくのなつやすみ"),
  );
  const page = readRoot("pages/[title].svelte");
  assert.match(page, /Empty page[\s\S]*\{#if owner\}[\s\S]*missingTitleCreateHref\(requestedTitle\)\}>作成<\/Link>/);
  const loader = readRoot("pages/[title].server.ts");
  assert.match(loader, /requestedTitle: title/);
  assert.match(loader, /requestedTitle: entry \? "" : title/);
  const created = readRoot("pages/new/index.svelte");
  assert.match(created, /let \{ presetTitle = "", diaryTitle = "" \} = \$props\(\)/);
  assert.match(created, /useForm\("\/edit\?diary", \{ title: diaryTitle, body: "", visibility: "public" \}\)/);
  assert.match(created, /useForm\("\/edit", \{ title: presetTitle, body: "", visibility: "public" \}\)/);
  assert.match(created, /presetTitle\.trim\(\)\.length > 0 \? "entry" : "diary"/);
  const createdLoader = readRoot("pages/new/index.server.ts");
  assert.match(createdLoader, /query\("title"\)/);
  assert.match(createdLoader, /presetTitle: typeof title === "string" \? title : ""/);
  assert.match(createdLoader, /diaryTitle: tokyoDateTitle\(\)/);
});

test("a public article or bookmark shows an edit link for the owner", () => {
  for (const path of ["pages/[title].svelte", "pages/e/[id].svelte"]) {
    const page = readRoot(path);
    assert.match(page, /owner && \(entry\.kind === "article" \|\| entry\.kind === "diary" \|\| entry\.kind === "bookmark" \|\| entry\.kind === "page"\)/);
    assert.match(page, /href=\{`\/edit\/\$\{entry\.id\}`\}>edit<\/Link>/);
  }
  const title = readRoot("pages/[title].server.ts");
  assert.match(title, /verifiedOwner\(/);
  assert.match(title, /private, no-store/);
  assert.match(title, /vary", "Cookie"/);
  const canonical = readRoot("pages/e/[id].server.ts");
  assert.match(canonical, /editableKind\(stored\.kind\)/);
  assert.match(canonical, /owner: showEdit/);
});

test("a bookmark page shows the stored URL beside the title", () => {
  assert.match(readRoot("pages/[title].svelte"), /kind === "bookmark" \? entry\.bookmarkUrl/);
  assert.match(readRoot("pages/e/[id].svelte"), /kind === "bookmark" \? entry\.bookmarkUrl/);
  assert.match(readRoot("pages/e/[id].server.ts"), /bookmarkUrl: stored\.bookmarkUrl/);
  const heading = readRoot("ui/entry-heading.svelte");
  assert.match(heading, /<h1 class="dads-heading__heading">\{title\}<\/h1>/);
  assert.match(heading, /class="entry-heading"/);
  assert.match(heading, /rel="external"/);
  assert.match(heading, /externalBookmarkHref/);
});

test("the article edit form posts visibility", () => {
  const page = readRoot("pages/edit/[id].svelte");
  const form = page.match(/<Form\b([^>]*)>([\s\S]*?)<\/Form>/);
  assert.ok(form);
  const inner = form[2] ?? "";
  assert.match(page, /useForm\(`\/edit\/\$\{entry\.id\}`/);
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
  assert.match(server, /updatePageFromEdit\(/);
  assert.match(server, /savedEntryHref\(result\.entry\)/);
  assert.match(page, /entry\.kind !== "page"/);
  assert.match(page, /Save page/);

  const canonical = readRoot("pages/e/[id].server.ts");
  assert.equal(canonical.includes("void/db"), false);
  assert.match(canonical, /readsDevCatalog\(/);
  assert.match(canonical, /readStoredEntry\(/);
  assert.match(canonical, /visibility === "public"/);
  assert.match(canonical, /visibility === "draft" && owner/);
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
    ["article-1", "note-1"],
  );
  const byPath = await readPublicEntryByPath(database, "Spaced_title");
  assert.equal(byPath?.id, "article-1");
  assert.equal(await readPublicEntryByPath(database, "draft-thought"), null);
  await database.insert(pathRedirects).values({ pathKey: "2022/1/27", entryId: "article-1" });
  await database.insert(pathRedirects).values({ pathKey: "old-draft", entryId: "draft-1" });
  const renamed = await readPublicPathRedirect(database, "2022/1/27");
  assert.deepEqual(renamed, { id: "article-1", viewPath: "Spaced_title" });
  assert.equal(publicAbsoluteHref(renamed!), "https://weblog.yamanoku.net/Spaced_title");
  assert.equal(await readPublicPathRedirect(database, "old-draft"), null);
  assert.equal(await readPublicPathRedirect(database, "missing"), null);
  sqlite.close();
});

test("the home list orders a later update before a later publish", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  await commitEntry(database, {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    kind: "note",
    title: "",
    body: "earlier update",
    visibility: "public",
    publishedAt: "2026-11-07T05:00:00.000Z",
    createdAt: "2026-11-07T05:00:00.000Z",
    updatedAt: "2026-11-07T05:00:00.000Z",
  });
  await commitEntry(database, {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    kind: "article",
    title: "Edited",
    body: "later update",
    visibility: "public",
    publishedAt: "2026-11-07T01:00:00.000Z",
    createdAt: "2026-11-07T01:00:00.000Z",
    updatedAt: "2026-11-07T06:00:00.000Z",
    viewPath: "Edited",
  });
  await commitEntry(database, {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    kind: "bookmark",
    title: "Same time",
    body: "tie",
    visibility: "public",
    bookmarkUrl: "https://example.com/tie",
    publishedAt: "2026-11-07T02:00:00.000Z",
    createdAt: "2026-11-07T02:00:00.000Z",
    updatedAt: "2026-11-07T05:00:00.000Z",
  });
  const deliverable = await listDeliverableEntries(database);
  assert.deepEqual(
    deliverable.map((entry) => entry.id),
    [
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    ],
  );
  const page = await listDeliverableEntryPage(database, 1, 2);
  assert.equal(page.total, 3);
  assert.deepEqual(
    page.rows.map((entry) => entry.id),
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "cccccccc-cccc-4ccc-8ccc-ccccccccccc3"],
  );
  const next = await listDeliverableEntryPage(database, 2, 2);
  assert.deepEqual(next.rows.map((entry) => entry.id), ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"]);
  const past = await listDeliverableEntryPage(database, 3, 2);
  assert.deepEqual(past.rows, []);
  assert.equal(past.total, 3);
  sqlite.close();
});

test("the home list includes a public page at its source time and leaves feeds unchanged", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  await commitEntry(database, {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    kind: "article",
    title: "Edited",
    body: "later update",
    visibility: "public",
    publishedAt: "2026-11-07T01:00:00.000Z",
    createdAt: "2026-11-07T01:00:00.000Z",
    updatedAt: "2026-11-07T06:00:00.000Z",
    viewPath: "Edited",
  });
  await commitEntry(database, {
    id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
    kind: "page",
    title: "2025-12-31",
    body: "2025-12-31\n[大晦日]",
    visibility: "public",
    publishedAt: null,
    createdAt: "2026-11-23T04:00:00.000Z",
    updatedAt: "2026-11-23T04:00:00.000Z",
    sourceUpdatedAt: 1_767_200_000,
    viewPath: "2025-12-31",
  });
  await commitEntry(database, {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5",
    kind: "page",
    title: "draft-page",
    body: "hidden",
    visibility: "draft",
    publishedAt: null,
    createdAt: "2026-11-23T04:00:00.000Z",
    updatedAt: "2026-11-23T04:00:00.000Z",
    sourceUpdatedAt: 1_800_000_000,
  });
  const deliverable = await listDeliverableEntries(database);
  assert.deepEqual(
    deliverable.map((entry) => entry.id),
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"],
  );
  const home = await listHomeEntryPage(database, 1, 12);
  assert.equal(home.total, 2);
  assert.deepEqual(
    home.rows.map((entry) => entry.id),
    ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "dddddddd-dddd-4ddd-8ddd-ddddddddddd4"],
  );
  sqlite.close();
});

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);
const firstImage = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const secondImage = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

function memoryImages() {
  const saved = new Map<string, NoteImageBytes>();
  const objects: EntryImageObjects = {
    async put(id, image) {
      saved.set(id, image);
    },
    async delete(id) {
      saved.delete(id);
    },
  };
  return { saved, objects };
}

test("an article stores many images, allows an empty alt, and can place one in the body", async () => {
  const parsed = await entryImagesFromField([
    { id: firstImage, alt: "  ", data: encodeNoteImage(png) },
    { id: secondImage, alt: " second ", data: encodeNoteImage(png) },
  ]);
  assert.deepEqual("images" in parsed ? parsed.images.map((image) => image.alt) : parsed, ["", "second"]);
  assert.equal(entryImageMarkdown("a]b", firstImage), `![a b](/note-images/${firstImage})`);
  assert.deepEqual(await entryImagesFromField([{ id: firstImage, alt: "x".repeat(1501), data: encodeNoteImage(png) }]), {
    error: "image_alt_length",
  });
  const accepted = acceptNoteImage(png);
  assert.ok(!("error" in accepted));

  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const images = memoryImages();
  const saved = await submitArticleFromEdit(
    database,
    { title: "With images", body: "text", visibility: "draft" },
    "images" in parsed ? parsed.images : [],
    images.objects,
  );
  assert.equal("error" in saved, false);
  if ("error" in saved) return;
  const rows = await database
    .select()
    .from(noteImages)
    .where(eq(noteImages.entryId, saved.id))
    .orderBy(asc(noteImages.position));
  assert.deepEqual(
    rows.map((row) => row.altText),
    ["", "second"],
  );
  assert.equal(images.saved.size, 2);
  assert.equal(noteImageIsPublic({ kind: "article", visibility: "draft" }, "image/png"), false);
  const views = await entryImageViews(database, [saved.id]);
  assert.equal(views.get(saved.id)?.[0]?.href, `/note-images/${firstImage}`);
  assert.equal(views.get(saved.id)?.[0]?.alt, "");
  assert.deepEqual(noteActivityAttachment(secondImage, "image/png", "second"), {
    type: "Image",
    mediaType: "image/png",
    url: `https://weblog.yamanoku.net/note-images/${secondImage}`,
    name: "second",
  });

  const published = await updateArticleFromEdit(
    database,
    saved.id,
    {
      title: "With images",
      body: entryImageMarkdown("second", secondImage),
      visibility: "public",
    },
    "2026-11-18T00:00:00.000Z",
  );
  assert.equal("entry" in published, true);
  if (!("entry" in published)) return;
  assert.equal(noteImageIsPublic({ kind: "article", visibility: "public" }, "image/png"), true);
  assert.match(published.entry.body, /!\[second\]/);

  const kept = await updateArticleFromEdit(
    database,
    saved.id,
    { title: "With images", body: published.entry.body, visibility: "public" },
    "2026-11-18T01:00:00.000Z",
    "images" in parsed ? [parsed.images[1]!] : [],
    images.objects,
  );
  assert.equal("entry" in kept, true);
  assert.equal(images.saved.has(firstImage), false);
  assert.equal(images.saved.has(secondImage), true);
  const left = await database.select().from(noteImages).where(eq(noteImages.entryId, saved.id));
  assert.equal(left.length, 1);
  assert.equal(left[0]?.id, secondImage);
  sqlite.close();
});

test("a public diary is deliverable and a draft diary is not", async () => {
  assert.equal(tokyoDateTitle(new Date("2026-11-24T15:00:00.000Z")), "2026-11-25");
  assert.equal(tokyoDateTitle(new Date("2026-11-24T14:59:00.000Z")), "2026-11-24");
  assert.equal("error" in diaryFromEditForm({ title: "2026-11-25", body: "", visibility: "public" }), true);

  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const saved = await submitDiaryFromEdit(database, {
    title: "2026-11-25",
    body: "today",
    visibility: "public",
  });
  assert.equal("error" in saved, false);
  if ("error" in saved) return;
  assert.equal(saved.kind, "diary");
  assert.equal(saved.publishedAt !== null, true);
  assert.deepEqual(
    (await listDiariesForEdit(database)).map((diary) => diary.id),
    [saved.id],
  );
  assert.equal((await listArticlesForEdit(database)).length, 0);
  assert.deepEqual(
    (await listDeliverableEntries(database)).map((entry) => entry.id),
    [saved.id],
  );

  const draft = await submitDiaryFromEdit(database, {
    title: "2026-11-24",
    body: "",
    visibility: "draft",
  });
  assert.equal("error" in draft, false);
  if ("error" in draft) return;
  assert.equal(draft.publishedAt, null);
  assert.equal((await listDeliverableEntries(database)).length, 1);

  const edited = await updateArticleFromEdit(
    database,
    saved.id,
    { title: "2026-11-25", body: "tonight", visibility: "public" },
    "2026-11-25T12:00:00.000Z",
  );
  assert.equal("entry" in edited, true);
  if (!("entry" in edited)) return;
  assert.equal(edited.entry.kind, "diary");
  assert.equal(edited.entry.body, "tonight");
  sqlite.close();
});

test("stored pages and date-titled articles become diaries without a delivery row", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  await commitEntry(database, {
    id: "page-old",
    kind: "page",
    title: "2022-01-27",
    body: "imported",
    visibility: "public",
    createdAt: "2022-01-27T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
  });
  await commitEntry(database, {
    id: "page-draft",
    kind: "page",
    title: "draft page",
    body: "hidden",
    visibility: "draft",
    createdAt: "2026-11-02T00:00:00.000Z",
    updatedAt: "2026-11-02T00:00:00.000Z",
  });
  await commitEntry(database, {
    id: "date-article",
    kind: "article",
    title: "2026-11-07",
    body: "day",
    visibility: "public",
    publishedAt: "2026-11-07T01:00:00.000Z",
    createdAt: "2026-11-07T01:00:00.000Z",
    updatedAt: "2026-11-07T01:00:00.000Z",
  });
  await commitEntry(database, {
    id: "long-article",
    kind: "article",
    title: "2026-11-07-test",
    body: "kept",
    visibility: "public",
    publishedAt: "2026-11-07T02:00:00.000Z",
    createdAt: "2026-11-07T02:00:00.000Z",
    updatedAt: "2026-11-07T02:00:00.000Z",
  });

  const sqlFile = readFileSync(join(rootDir, "db/migrations/20261125120000_diary_kind.sql"), "utf8");
  for (const statement of sqlFile.split("--> statement-breakpoint")) {
    const text = statement.trim();
    if (text.length > 0) sqlite.exec(text);
  }

  assert.equal((await readStoredEntry(database, "page-old"))?.kind, "diary");
  assert.equal((await readStoredEntry(database, "page-old"))?.publishedAt, "2022-01-27T00:00:00.000Z");
  assert.equal((await readStoredEntry(database, "page-draft"))?.kind, "diary");
  assert.equal((await readStoredEntry(database, "page-draft"))?.publishedAt, null);
  assert.equal((await readStoredEntry(database, "date-article"))?.kind, "diary");
  assert.equal((await readStoredEntry(database, "date-article"))?.publishedAt, "2026-11-07T01:00:00.000Z");
  assert.equal((await readStoredEntry(database, "long-article"))?.kind, "article");
  const delivered = await listDeliverableEntries(database);
  assert.deepEqual(
    delivered.map((entry) => entry.id).sort(),
    ["date-article", "long-article", "page-old"],
  );
  sqlite.close();
});
