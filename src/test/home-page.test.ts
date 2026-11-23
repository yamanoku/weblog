import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import {
  homePageCount,
  homePageHref,
  homePageNumbers,
  homePageSlice,
  homePageSize,
  parseHomePage,
} from "../domain/home-page.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

test("a home page number is a positive integer, and the first page omits it", () => {
  assert.equal(parseHomePage(undefined), 1);
  assert.equal(parseHomePage(""), 1);
  assert.equal(parseHomePage("1"), 1);
  assert.equal(parseHomePage("2"), 2);
  assert.equal(parseHomePage("0"), null);
  assert.equal(parseHomePage("01"), null);
  assert.equal(parseHomePage("2a"), null);
  assert.equal(parseHomePage("-1"), null);
  assert.equal(homePageHref(1), "/");
  assert.equal(homePageHref(2), "/?page=2");
});

test("each home page holds ten entries and the last page keeps the remainder", () => {
  const entries = Array.from({ length: 21 }, (_, index) => index);
  assert.equal(homePageSize, 10);
  assert.equal(homePageCount(21), 3);
  assert.equal(homePageCount(0), 1);
  assert.deepEqual(homePageSlice(entries, 1), entries.slice(0, 10));
  assert.deepEqual(homePageSlice(entries, 2), entries.slice(10, 20));
  assert.deepEqual(homePageSlice(entries, 3), [20]);
  assert.deepEqual(homePageNumbers(2, 4), [1, 2, 3, 4]);
  assert.deepEqual(homePageNumbers(5, 12), [1, "gap", 4, 5, 6, "gap", 12]);
});

test("the home page links the next ten entries", () => {
  const page = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  const loader = readFileSync(join(rootDir, "pages/index.server.ts"), "utf8");
  assert.match(page, /class="entry-grid"/);
  assert.match(page, /class="entry-card"/);
  assert.equal(page.includes("groupByUpdatedDay"), false);
  assert.equal(page.includes("entry-list__date"), false);
  assert.match(page, /aria-label="ページ"/);
  assert.match(page, /rel="prev">前へ/);
  assert.match(page, /rel="next">次へ/);
  assert.match(page, /aria-current="page"/);
  assert.match(page, /homePageHref/);
  assert.match(loader, /parseHomePage/);
  assert.match(loader, /listDeliverableEntryPage/);
  assert.match(loader, /invalid_page/);
  assert.match(loader, /Not a page/);
});
