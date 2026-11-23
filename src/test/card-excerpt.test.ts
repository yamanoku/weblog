import assert from "node:assert/strict";
import { test } from "vitest";
import { cardBodyExcerpt, cardBodyLimit } from "../domain/card-excerpt.ts";

test("a home card keeps at most 100 characters of the body", () => {
  const note = "あ".repeat(cardBodyLimit);
  assert.equal(cardBodyExcerpt(note, "note"), note);
  assert.equal(cardBodyExcerpt(`${note}い`, "note"), `${note}…`);
  assert.equal([...cardBodyExcerpt(`${note}い`, "note")].length, cardBodyLimit + 1);

  const spaced = cardBodyExcerpt("一行目\n\n二行目", "note");
  assert.equal(spaced, "一行目 二行目");

  const article = cardBodyExcerpt(`# 見出し\n\n**太字**と[表示](https://example.com/${"x".repeat(80)})`, "article");
  assert.equal(article.startsWith("見出し 太字と表示"), true);
  assert.equal(article.includes("https://"), false);
  assert.equal(article.includes("**"), false);

  const page = cardBodyExcerpt("2025-01-01\n[大晦日](/大晦日) と [https://gyazo.com/abc]", "page");
  assert.equal(page, "2025-01-01 大晦日 と [https://gyazo.com/abc]");

  const image = cardBodyExcerpt("![画素](/note-images/abc)\n\n本文", "bookmark");
  assert.equal(image, "画素 本文");
  assert.equal(cardBodyExcerpt("   \n", "note"), "");
});
