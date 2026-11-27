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

  const image = markdownToHtml("![pixel](/note-images/abc)\n\n![](javascript:alert(1))");
  assert.match(image, /<img src="\/note-images\/abc" alt="pixel">/);
  assert.equal(image.includes('src="javascript:'), false);

  const titled = markdownToHtml(
    "[Astroの内部で使われるかもしれない Hono JSX の可能性 by ケンジ/kenji | プロポーザル | Hono Conference 2025 [honoconf](/honoconf) - fortee.jp](https://fortee.jp/honoconf-2025/proposal/1a516dd7-8f53-4b29-95df-d400bc553812)",
  );
  assert.match(
    titled,
    /<a href="https:\/\/fortee\.jp\/honoconf-2025\/proposal\/1a516dd7-8f53-4b29-95df-d400bc553812">Astroの内部で使われるかもしれない Hono JSX の可能性 by ケンジ\/kenji \| プロポーザル \| Hono Conference 2025 honoconf - fortee\.jp<\/a>/,
  );
  assert.equal(titled.includes('href="/honoconf"'), false);
  assert.equal(titled.includes("](https://fortee.jp"), false);

  const discussion = markdownToHtml(
    "[Support JSX syntax for Astro components · withastro roadmap · Discussion [716](/716) · GitHub](https://github.com/withastro/roadmap/discussions/716#discussioncomment-14062964)",
  );
  assert.match(
    discussion,
    /<a href="https:\/\/github\.com\/withastro\/roadmap\/discussions\/716#discussioncomment-14062964">Support JSX syntax for Astro components · withastro roadmap · Discussion 716 · GitHub<\/a>/,
  );
  assert.equal(discussion.includes('href="/716"'), false);

  const brackets = markdownToHtml("[see [note] here](https://example.com/a)");
  assert.match(brackets, /<a href="https:\/\/example\.com\/a">see \[note\] here<\/a>/);

  const nested = markdownToHtml("- outer\n  - inner\n\n> quoted\n\n~~gone~~");
  assert.match(nested, /<ul><li>outer<ul><li>inner<\/li><\/ul><\/li><\/ul>/);
  assert.match(nested, /<blockquote><p>quoted<\/p><\/blockquote>/);
  assert.match(nested, /<del>gone<\/del>/);
});

test("public article pages render markdown and the edit form keeps the source", () => {
  const home = readFileSync(join(rootDir, "pages/index.svelte"), "utf8");
  assert.equal(home.includes("cardBodyExcerpt"), false);
  assert.equal(home.includes("{@html"), false);
  assert.equal(home.includes("entry.images"), false);
  for (const path of ["pages/[title].svelte", "pages/e/[id].svelte"]) {
    const page = readFileSync(join(rootDir, path), "utf8");
    assert.match(
      page,
      /markdownToHtml\(entry\.body, entry\.gyazo \?\? \{\}, entry\.speakerdeck \?\? \{\}, entry\.icons \?\? \{\}, entry\.createdAt\)/,
    );
    assert.match(page, /\{@html/);
    assert.match(
      page,
      /\{#if entry\.kind === "bookmark"\}\s*\{#each entry\.images \?\? \[\] as image \(image\.href\)\}/,
    );
  }
  const edit = readFileSync(join(rootDir, "pages/edit/[id].svelte"), "utf8");
  assert.equal(edit.includes("{@html"), false);
  assert.match(edit, /<textarea\b[^>]*name="body"/);
});
