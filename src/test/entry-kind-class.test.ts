import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { entryClass, entryKindClass } from "../domain/entry-kind-class.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

test("diary and article get their own class beside the shared layout class", () => {
  assert.equal(entryKindClass("diary"), "entry--diary");
  assert.equal(entryKindClass("article"), "entry--article");
  assert.equal(entryKindClass("note"), "");
  assert.equal(entryKindClass("bookmark"), "");
  assert.equal(entryKindClass("page"), "");
  assert.equal(entryClass("entry-card", "diary"), "entry-card entry--diary");
  assert.equal(entryClass("entry-article", "article"), "entry-article entry--article");
  assert.equal(entryClass("form-stack", "note"), "form-stack");
});

test("the public entry and the owner forms use the kind class", () => {
  const home = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  const title = readFileSync(join(rootDir, "pages/[title].svelte"), "utf8");
  const canonical = readFileSync(join(rootDir, "pages/e/[id].svelte"), "utf8");
  const edit = readFileSync(join(rootDir, "pages/edit/[id].svelte"), "utf8");
  const create = readFileSync(join(rootDir, "pages/new/index.svelte"), "utf8");
  assert.match(home, /entryClass\("entry-card", entry\.kind\)/);
  assert.match(title, /entryClass\("entry-article", entry\.kind\)/);
  assert.match(canonical, /entryClass\("entry-article", entry\.kind\)/);
  assert.match(canonical, /class="entry-article" id="note-/);
  assert.match(edit, /entryClass\("form-stack", entry\.kind\)/);
  assert.match(create, /class="form-stack entry--diary"/);
  assert.match(create, /class="form-stack entry--article"/);
  const css = readFileSync(join(rootDir, "styles/site.css"), "utf8");
  assert.match(css, /@supports \(rule: 1px solid var\(--color-neutral-solid-gray-200\)\) \{\n {2}\.entry--diary \.entry-body \{/);
  assert.match(css, /@supports not \(rule: 1px solid var\(--color-neutral-solid-gray-200\)\) \{\n {2}\.entry--diary \.entry-body \{/);
  assert.equal(css.includes("@supports (rule: 1px solid var(--color-neutral-solid-gray-200)) {\n  .entry-body {"), false);
});
