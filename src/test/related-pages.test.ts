import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { catalogRelatedPages } from "../domain/catalog.ts";
import { pageLinkTitles, relatedPageLinks, type RelatedSource } from "../domain/related-pages.ts";
import { pastTitles } from "../db/schema.ts";
import { commitEntry } from "../store/entries.ts";
import { listRelatedPages } from "../store/related-pages.ts";

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

function source(row: Partial<RelatedSource> & Pick<RelatedSource, "id" | "title">): RelatedSource {
  return {
    body: "",
    viewPath: row.title,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...row,
  };
}

test("page links skip fences, inline code, tables, external urls, and a line id", () => {
  const titles = pageLinkTitles(
    [
      "[Beta](/Beta)",
      "[Gamma #0123456789abcdef01234567](/Gamma)",
      "[Example](https://example.com/a)",
      "`[Hidden](/Hidden)`",
      "```",
      "[Secret](/Secret)",
      "```",
      "| [Cell](/Cell) |",
      "| --- |",
      "| kept |",
      "![pic](/Pic)",
    ].join("\n"),
  );
  assert.deepEqual(titles, ["Beta", "Gamma"]);
});

test("related pages list the other public entry once, outgoing first", () => {
  const alpha = source({
    id: "alpha",
    title: "Alpha",
    body: "[Beta](/Beta)\n[Gamma](/Gamma)\n[Beta](/Beta)\n[Alpha](/Alpha)\n[Missing](/Missing)",
    updatedAt: "2026-11-01T00:00:00.000Z",
  });
  const beta = source({
    id: "beta",
    title: "Beta",
    body: "[Alpha](/Alpha)",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  const gamma = source({
    id: "gamma",
    title: "Gamma",
    body: "no link",
    updatedAt: "2026-06-01T00:00:00.000Z",
  });
  const delta = source({
    id: "delta",
    title: "Delta",
    body: "[Alpha](/Alpha)",
    updatedAt: "2026-12-01T00:00:00.000Z",
  });
  const epsilon = source({
    id: "epsilon",
    title: "Epsilon",
    body: "[Alpha](/Alpha)",
    updatedAt: "2026-02-01T00:00:00.000Z",
  });
  const rows = [alpha, beta, gamma, delta, epsilon];
  const byTitle = new Map(rows.map((row) => [row.title, row]));
  const links = relatedPageLinks(alpha, (title) => byTitle.get(title) ?? null, rows);
  assert.deepEqual(
    links.map((link) => [link.id, link.href, link.text]),
    [
      ["beta", "/Beta", "Beta"],
      ["gamma", "/Gamma", "Gamma"],
      ["delta", "/Delta", "Delta"],
      ["epsilon", "/Epsilon", "Epsilon"],
    ],
  );
});

test("a bookmark related page stays on this host", () => {
  const page = source({ id: "page", title: "Page", body: "[Save](/Save)", viewPath: "Page" });
  const save = source({ id: "save", title: "Save", body: "", viewPath: null });
  const links = relatedPageLinks(page, (title) => (title === "Save" ? save : null), [save]);
  assert.deepEqual(links, [{ id: "save", href: "/Save", text: "Save" }]);
});

test("two public rows with one title are not a related page", () => {
  const host = source({ id: "host", title: "Host", body: "[Twin](/Twin)" });
  const twins = [
    source({ id: "twin-a", title: "Twin" }),
    source({ id: "twin-b", title: "Twin" }),
  ];
  const links = relatedPageLinks(host, () => null, twins);
  assert.deepEqual(links, []);
});

test("stored rows list both directions and a past title", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const rows = [
    ["alpha", "Alpha", "[Beta](/Beta)\n[Gamma](/Gamma)", "2026-11-01T00:00:00.000Z"],
    ["beta", "Beta", "[Alpha](/Alpha)", "2026-01-01T00:00:00.000Z"],
    ["gamma", "Gamma", "plain", "2026-06-01T00:00:00.000Z"],
    ["delta", "Delta", "[Alpha](/Alpha)", "2026-12-01T00:00:00.000Z"],
    ["secret", "Secret", "outside", "2026-03-01T00:00:00.000Z"],
    ["renamed", "New", "kept", "2026-04-01T00:00:00.000Z"],
    ["linker", "Linker", "[Old](/Old)", "2026-05-01T00:00:00.000Z"],
  ] as const;
  for (const [id, title, body, updatedAt] of rows) {
    await commitEntry(database, {
      id,
      kind: "page",
      title,
      body,
      visibility: "public",
      createdAt: updatedAt,
      updatedAt,
      viewPath: title,
    });
  }
  await commitEntry(database, {
    id: "draft",
    kind: "page",
    title: "Draft",
    body: "[Alpha](/Alpha)",
    visibility: "draft",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    viewPath: "Draft",
  });
  await database.insert(pastTitles).values({
    entryId: "renamed",
    title: "Old",
    recordedAt: "2026-04-01T00:00:00.000Z",
  });
  const alpha = await listRelatedPages(database, {
    id: "alpha",
    title: "Alpha",
    body: "[Beta](/Beta)\n[Gamma](/Gamma)\n```\n[Secret](/Secret)\n```",
  });
  assert.deepEqual(
    alpha.map((link) => link.text),
    ["Beta", "Gamma", "Delta"],
  );
  const linker = await listRelatedPages(database, {
    id: "linker",
    title: "Linker",
    body: "[Old](/Old)",
  });
  assert.deepEqual(linker, [{ id: "renamed", href: "/New", text: "New" }]);
  sqlite.close();
});

test("the sample catalog links articles to each other and the entry pages render the list", () => {
  const links = catalogRelatedPages({
    id: "entry-article-20261121",
    title: "見出しはページに一つ",
    body: "[morning-note](/morning-note)",
  });
  assert.equal(links.some((link) => link.text === "morning-note" && link.href === "/morning-note"), true);
  assert.equal(links.some((link) => link.id === "entry-article-20261121"), false);
  const title = readFileSync(join(rootDir, "pages/[title].svelte"), "utf8");
  const canonical = readFileSync(join(rootDir, "pages/e/[id].svelte"), "utf8");
  const section = readFileSync(join(rootDir, "ui/related-pages.svelte"), "utf8");
  assert.match(title, /<RelatedPages links=\{related\} \/>/);
  assert.match(canonical, /<RelatedPages links=\{related\} \/>/);
  assert.match(section, /関連ページ/);
  assert.match(section, /<ul>/);
  const home = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  assert.equal(home.includes("関連ページ"), false);
});
