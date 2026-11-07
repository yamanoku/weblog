import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { markdownToHtml } from "../domain/markdown-html.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

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

test("article markdown becomes html and raw html stays text", () => {
  const html = markdownToHtml(markdown);
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<ul><li>item<\/li><li>another item<\/li><\/ul>/);
  assert.match(html, /<a href="https:\/\/example.com\/path">example<\/a>/);
  assert.match(html, /<pre><code>const value = 1;<\/code><\/pre>/);
  assert.equal(html.includes("<h1>Heading</h1>\n<ul>"), true);

  const written = markdownToHtml("## 実際に\r\nどういう感じで出るのかテスト");
  assert.match(written, /<h2>実際に<\/h2>/);
  assert.match(written, /<p>どういう感じで出るのかテスト<\/p>/);

  const hostile = markdownToHtml("<script>alert(1)</script>\n\n[click](javascript:alert(1))");
  assert.equal(hostile.includes("<script>"), false);
  assert.match(hostile, /&lt;script&gt;/);
  assert.equal(hostile.includes("javascript:"), true);
  assert.equal(hostile.includes('href="javascript:'), false);
});

test("public article pages render markdown and the edit form keeps the source", () => {
  for (const path of ["pages/index.svelte", "pages/[title].svelte", "pages/e/[id].svelte"]) {
    const page = readFileSync(join(rootDir, path), "utf8");
    assert.match(page, /markdownToHtml\(entry\.body\)/);
    assert.match(page, /\{@html/);
  }
  const edit = readFileSync(join(rootDir, "pages/edit/[id].svelte"), "utf8");
  assert.equal(edit.includes("{@html"), false);
  assert.match(edit, /<textarea\b[^>]*name="body"/);
});
