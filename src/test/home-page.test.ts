import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import {
  isRealDateTitle,
  monthDiaryHrefs,
  monthDocumentTitle,
  monthHref,
  monthLabel,
  monthWeeks,
  parseHomeMonth,
  sameDayLinks,
  shiftMonth,
  tokyoDayBounds,
  type CalendarSource,
} from "../domain/home-calendar.ts";
import { commitEntry, listMonthDiaryHrefs, listSameDayLinks } from "../store/entries.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const today = new Date("2026-11-26T03:00:00.000Z");

function source(
  row: Partial<CalendarSource> & Pick<CalendarSource, "id" | "title" | "kind">,
): CalendarSource {
  return {
    visibility: "public",
    viewPath: null,
    createdAt: null,
    inReplyToId: null,
    ...row,
  };
}

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

test("an absent month is the current Tokyo month, and a bad month is rejected", () => {
  assert.deepEqual(parseHomeMonth(undefined, today), { year: 2026, month: 11 });
  assert.deepEqual(parseHomeMonth("", today), { year: 2026, month: 11 });
  assert.deepEqual(parseHomeMonth("2026-11", today), { year: 2026, month: 11 });
  assert.deepEqual(parseHomeMonth("2020-01", today), { year: 2020, month: 1 });
  assert.equal(parseHomeMonth("2026-13", today), null);
  assert.equal(parseHomeMonth("2026-1", today), null);
  assert.equal(parseHomeMonth("2026-11-26", today), null);
  assert.equal(isRealDateTitle("2026-11-31"), false);
  assert.equal(isRealDateTitle("2024-02-29"), true);
  assert.equal(isRealDateTitle("2026-02-29"), false);
});

test("month movement uses the current month as / and keeps an empty month", () => {
  const current = { year: 2026, month: 11 };
  assert.equal(monthHref(current, current), "/");
  assert.equal(monthHref(shiftMonth(current, -1), current), "/?month=2026-10");
  assert.equal(monthHref(shiftMonth(current, 1), current), "/?month=2026-12");
  assert.equal(monthHref(shiftMonth({ year: 2026, month: 1 }, -1), current), "/?month=2025-12");
  assert.equal(monthLabel({ year: 2026, month: 11 }), "2026年11月");
  assert.equal(monthLabel({ year: 2026, month: 1 }), "2026年1月");
  assert.equal(monthDocumentTitle({ year: 2026, month: 11 }), "2026年11月 - weblog.yamanoku.net");
  const weeks = monthWeeks({ year: 2026, month: 11 }, {}, "2026-11-26");
  assert.equal(weeks[0]?.[0]?.day, 1);
  assert.equal(weeks[0]?.[0]?.date, "2026-11-01");
  assert.equal(
    weeks
      .flat()
      .filter((cell) => cell?.current)
      .map((cell) => cell?.day)
      .join(),
    "26",
  );
  const december = monthWeeks({ year: 2026, month: 12 }, {}, "2026-11-26");
  assert.equal(december[0]?.[0], null);
  assert.equal(december[0]?.[1], null);
  assert.equal(december[0]?.[2]?.day, 1);
  assert.equal(
    december.flat().some((cell) => cell?.current),
    false,
  );
});

test("a calendar link is only a public date diary with a view path", () => {
  const hrefs = monthDiaryHrefs(
    [
      source({ id: "b", title: "2026-11-26", kind: "diary", viewPath: "2026-11-26" }),
      source({ id: "a", title: "2026-11-26", kind: "diary", viewPath: "other" }),
      source({ id: "missing", title: "2026-11-22", kind: "diary", viewPath: null }),
      source({ id: "article", title: "2026-11-21", kind: "article", viewPath: "2026-11-21" }),
      source({ id: "page", title: "2026-11-20", kind: "page", viewPath: "2026-11-20" }),
      source({
        id: "draft",
        title: "2026-11-19",
        kind: "diary",
        visibility: "draft",
        viewPath: "2026-11-19",
      }),
      source({ id: "fake", title: "2026-11-31", kind: "diary", viewPath: "2026-11-31" }),
    ],
    { year: 2026, month: 11 },
  );
  assert.deepEqual(hrefs, { "2026-11-26": "/other" });
  const linked = monthWeeks({ year: 2026, month: 11 }, hrefs, "2026-11-26").flat();
  const day = linked.find((cell) => cell?.date === "2026-11-26");
  assert.equal(day?.href, "/other");
  assert.equal(day?.accessibleName, "2026年11月26日");
  assert.equal(day?.day, 26);
  assert.equal(day?.current, true);
  assert.equal(linked.find((cell) => cell?.date === "2026-11-22")?.href, null);
});

test("same-day links keep the Tokyo day, oldest first, on this host", () => {
  assert.deepEqual(tokyoDayBounds("2026-11-26"), {
    start: "2026-11-25T15:00:00.000Z",
    end: "2026-11-26T15:00:00.000Z",
  });
  const links = sameDayLinks(
    [
      source({ id: "d", title: "明日", kind: "article", createdAt: "2026-11-26T15:00:00.000Z" }),
      source({ id: "b", title: "メモ", kind: "note", createdAt: "2026-11-26T14:59:59.999Z" }),
      source({
        id: "c",
        title: "保存",
        kind: "bookmark",
        createdAt: "2026-11-26T03:00:00.000Z",
        viewPath: "saved",
      }),
      source({ id: "a", title: "記事", kind: "article", createdAt: "2026-11-25T15:00:00.000Z" }),
      source({
        id: "reply",
        title: "返信",
        kind: "note",
        createdAt: "2026-11-26T01:00:00.000Z",
        inReplyToId: "b",
      }),
      source({
        id: "draft",
        title: "下書き",
        kind: "article",
        visibility: "draft",
        createdAt: "2026-11-26T02:00:00.000Z",
      }),
      source({
        id: "diary",
        title: "2026-11-26",
        kind: "diary",
        createdAt: "2026-11-26T04:00:00.000Z",
        viewPath: "2026-11-26",
      }),
      source({ id: "page", title: "ページ", kind: "page", createdAt: "2026-11-26T05:00:00.000Z" }),
      source({ id: "odd", title: "形", kind: "article", createdAt: "2026-11-26T06:00:00Z" }),
      source({ id: "empty", title: "  ", kind: "article", createdAt: "2026-11-26T07:00:00.000Z" }),
    ],
    "2026-11-26",
  );
  assert.deepEqual(
    links.map((link) => link.id),
    ["a", "c", "empty", "b"],
  );
  assert.equal(links[1]?.href, "/saved");
  assert.equal(links[1]?.text, "保存");
  assert.equal(links[2]?.text, "https://weblog.yamanoku.net/e/empty");
  assert.equal(links[2]?.href, "/e/empty");
  assert.equal(links[3]?.href, "/e/b");
  assert.deepEqual(sameDayLinks([], "2026-11-26"), []);
  assert.deepEqual(
    sameDayLinks(
      [source({ id: "x", title: "記事", kind: "article", createdAt: "2026-11-26T01:00:00.000Z" })],
      "topic",
    ),
    [],
  );
});

test("the home page is a month table and a dated diary lists the same day", () => {
  const page = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  const loader = readFileSync(join(rootDir, "pages/index.server.ts"), "utf8");
  assert.match(page, /class="month-calendar"/);
  assert.match(page, /<caption/);
  assert.match(page, /scope="col">日/);
  assert.match(page, /aria-label="月"/);
  assert.match(page, />前の月</);
  assert.match(page, />次の月</);
  assert.match(page, /aria-current=\{cell\.current \? "date" : undefined\}/);
  assert.match(page, /aria-label=\{cell\.accessibleName\}/);
  assert.match(page, /<time datetime=\{cell\.date\}/);
  assert.match(page, /いまどうしてる？/);
  assert.equal(page.includes("entry-grid"), false);
  assert.equal(page.includes("cardBodyExcerpt"), false);
  assert.match(loader, /invalid_month/);
  assert.match(loader, /parseHomeMonth/);
  assert.match(loader, /listMonthDiaryHrefs/);
  assert.match(loader, /catalogMonthHrefs/);
  assert.equal(loader.includes("invalid_page"), false);
  assert.equal(loader.includes('query("page")'), false);
  const title = readFileSync(join(rootDir, "pages/[title].svelte"), "utf8");
  const canonical = readFileSync(join(rootDir, "pages/e/[id].svelte"), "utf8");
  assert.match(title, /<SameDay links=\{sameDay\} \/>/);
  assert.match(canonical, /<SameDay links=\{sameDay\} \/>/);
  const section = readFileSync(join(rootDir, "ui/same-day.svelte"), "utf8");
  assert.match(section, /当日書いたコンテンツ/);
});

test("stored rows use the Tokyo bounds for the calendar and the same-day list", async () => {
  const sqlite = applyShippedMigrations();
  const database = drizzle(sqlite);
  const rows = [
    ["a", "article", "記事", "2026-11-25T15:00:00.000Z", null],
    ["c", "bookmark", "保存", "2026-11-26T03:00:00.000Z", "saved"],
    ["b", "note", "メモ", "2026-11-26T14:59:59.999Z", null],
    ["d", "article", "明日", "2026-11-26T15:00:00.000Z", null],
    ["diary", "diary", "2026-11-26", "2026-11-26T00:00:00.000Z", "2026-11-26"],
    ["nopath", "diary", "2026-11-22", "2026-11-22T00:00:00.000Z", null],
    ["draft", "diary", "2026-11-21", "2026-11-21T00:00:00.000Z", "2026-11-21"],
  ] as const;
  for (const [id, kind, title, createdAt, viewPath] of rows) {
    await commitEntry(database, {
      id,
      kind,
      title,
      body: title,
      visibility: id === "draft" ? "draft" : "public",
      publishedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      viewPath,
      bookmarkUrl: kind === "bookmark" ? "https://example.com/out" : null,
    });
  }
  assert.deepEqual(await listMonthDiaryHrefs(database, { year: 2026, month: 11 }), {
    "2026-11-26": "/2026-11-26",
  });
  const links = await listSameDayLinks(database, "2026-11-26");
  assert.deepEqual(
    links.map((link) => [link.id, link.href, link.text]),
    [
      ["a", "/e/a", "記事"],
      ["c", "/saved", "保存"],
      ["b", "/e/b", "メモ"],
    ],
  );
  sqlite.close();
});
