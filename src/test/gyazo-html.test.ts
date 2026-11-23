import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import {
  gyazoContentType,
  gyazoImageIds,
  gyazoPublicOrigin,
  parseGyazoPath,
  parseGyazoUrl,
} from "../domain/gyazo.ts";
import { markdownToHtml } from "../domain/markdown-html.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const one = { abc: ["png"] };

test("a gyazo url with one indexed extension becomes an image on this host", () => {
  const source = "[https://gyazo.com/abc]";
  const html = markdownToHtml(source, one);
  assert.equal(
    html,
    `<p><img src="${gyazoPublicOrigin}/gyazo/abc.png" alt="https://gyazo.com/abc"></p>`,
  );
  assert.equal(source, "[https://gyazo.com/abc]");
  assert.equal(markdownToHtml(source).includes("<img"), false);

  const pair = markdownToHtml(
    "  - [https://gyazo.com/abc][https://gyazo.com/def]",
    { abc: ["png"], def: ["jpg"] },
  );
  assert.match(pair, /<li><img src="https:\/\/weblog\.yamanoku\.net\/gyazo\/abc\.png"/);
  assert.match(pair, /<img src="https:\/\/weblog\.yamanoku\.net\/gyazo\/def\.jpg" alt="https:\/\/gyazo\.com\/def">/);

  const named = markdownToHtml("[HTTPS://I.Gyazo.com/abc.PNG](https://i.gyazo.com/abc.PNG)", one);
  assert.match(named, /<img src="https:\/\/weblog\.yamanoku\.net\/gyazo\/abc\.png"/);
  assert.match(named, /alt="https:\/\/i\.gyazo\.com\/abc\.PNG"/);
});

test("a gyazo url beside another url in one bracket is an image link", () => {
  const source =
    "- [https://gyazo.com/1982f3707b54fa255e42122b0f618578 https://x.com/bunjavascript/status/1909887663500619940]";
  const html = markdownToHtml(source, { "1982f3707b54fa255e42122b0f618578": ["png"] });
  assert.equal(
    html,
    `<ul><li><a href="https://x.com/bunjavascript/status/1909887663500619940"><img src="${gyazoPublicOrigin}/gyazo/1982f3707b54fa255e42122b0f618578.png" alt="https://gyazo.com/1982f3707b54fa255e42122b0f618578"></a></li></ul>`,
  );
  assert.equal(source.includes("!["), false);

  const reversed = markdownToHtml(
    "[https://x.com/bunjavascript/status/1909887663500619940 https://gyazo.com/abc]",
    one,
  );
  assert.equal(
    reversed,
    `<p><a href="https://x.com/bunjavascript/status/1909887663500619940"><img src="${gyazoPublicOrigin}/gyazo/abc.png" alt="https://gyazo.com/abc"></a></p>`,
  );

  const video = markdownToHtml("[https://gyazo.com/abc https://example.com/watch]", { abc: ["mp4"] });
  assert.match(video, /^<p><a href="https:\/\/example.com\/watch"><video controls src="/);

  const missing = markdownToHtml(source, {});
  assert.equal(missing.includes("<img"), false);
  assert.equal(missing.includes("!["), false);
  assert.match(missing, /<a href="https:\/\/gyazo\.com\/1982f3707b54fa255e42122b0f618578">/);
  assert.match(missing, /<a href="https:\/\/x\.com\/bunjavascript\/status\/1909887663500619940">/);

  assert.deepEqual(
    gyazoImageIds(
      "[https://gyazo.com/1982f3707b54fa255e42122b0f618578 https://x.com/bunjavascript/status/1909887663500619940]",
    ),
    ["1982f3707b54fa255e42122b0f618578"],
  );
});

test("an unknown or ambiguous gyazo url stays an external link", () => {
  const missing = markdownToHtml("[https://gyazo.com/abc]", {});
  assert.equal(missing, '<p><a href="https://gyazo.com/abc">https://gyazo.com/abc</a></p>');
  assert.equal(missing.includes(gyazoPublicOrigin), false);

  const several = markdownToHtml("[https://gyazo.com/abc]", { abc: ["png", "mp4"] });
  assert.equal(several.includes(gyazoPublicOrigin), false);
  assert.match(several, /<a href="https:\/\/gyazo\.com\/abc">/);

  const other = markdownToHtml("[https://gyazo.com/abc.jpg]", { abc: ["png"] });
  assert.equal(other.includes("/gyazo/"), false);

  const picked = markdownToHtml("[https://gyazo.com/abc.png]", { abc: ["png", "mp4"] });
  assert.match(picked, /<img src="https:\/\/weblog\.yamanoku\.net\/gyazo\/abc\.png"/);

  const query = markdownToHtml("[https://gyazo.com/abc?w=1]", one);
  assert.match(query, /alt="https:\/\/gyazo\.com\/abc\?w=1"/);
  assert.match(query, /src="https:\/\/weblog\.yamanoku\.net\/gyazo\/abc\.png"/);
});

test("mp4 is a video and any other indexed extension is a link on this host", () => {
  const video = markdownToHtml("[https://gyazo.com/abc]", { abc: ["mp4"] });
  assert.equal(
    video,
    `<p><video controls src="${gyazoPublicOrigin}/gyazo/abc.mp4"></video></p>`,
  );
  const text = markdownToHtml("[https://gyazo.com/abc.txt]", { abc: ["txt"] });
  assert.match(text, /<a href="https:\/\/weblog\.yamanoku\.net\/gyazo\/abc\.txt">/);
  assert.equal(text.includes("<img"), false);
});

test("code and non-gyazo files stay as written", () => {
  const fenced = markdownToHtml("```\n[https://gyazo.com/abc]\n```", one);
  assert.match(fenced, /<code>\[https:\/\/gyazo\.com\/abc\]<\/code>/);
  assert.equal(fenced.includes("<img"), false);
  const inline = markdownToHtml("`[https://gyazo.com/abc]`", one);
  assert.match(inline, /<code>\[https:\/\/gyazo\.com\/abc\]<\/code>/);
  const files = markdownToHtml("[https://scrapbox.io/files/abc.png]", one);
  assert.equal(files.includes("<img"), false);
  assert.match(files, /\[https:\/\/scrapbox\.io\/files\/abc\.png\]/);
});

test("image ids come from gyazo urls and skip fenced code", () => {
  assert.deepEqual(
    gyazoImageIds("[https://gyazo.com/abc][https://gyazo.com/abc]\n```\nhttps://gyazo.com/hidden\n```"),
    ["abc"],
  );
  assert.equal(parseGyazoUrl("https://example.com/abc"), null);
  assert.deepEqual(parseGyazoPath("abc.PNG"), { imageId: "abc", extension: "png" });
  assert.equal(parseGyazoPath("../abc.png"), null);
  assert.equal(parseGyazoPath("abc"), null);
  assert.equal(gyazoContentType("jpg", null), "image/jpeg");
  assert.equal(gyazoContentType("jpg", " image/jpeg "), "image/jpeg");
  assert.equal(gyazoContentType("bin", "application/octet-stream"), "application/octet-stream");
  assert.equal(gyazoContentType("bin", "  "), "application/octet-stream");
});

test("the gyazo route reads one object and does not list the bucket", () => {
  const route = readFileSync(join(rootDir, "routes/gyazo/[file].ts"), "utf8");
  assert.match(route, /c\.env\.GYAZO_BUCKET/);
  assert.match(route, /readGyazoObject/);
  assert.match(route, /public, max-age=86400/);
  assert.match(route, /store_unavailable/);
  assert.equal(route.includes(".list("), false);
  assert.equal(route.includes(".put("), false);
  const title = readFileSync(join(rootDir, "pages/[title].server.ts"), "utf8");
  const canonical = readFileSync(join(rootDir, "pages/e/[id].server.ts"), "utf8");
  assert.match(title, /gyazoIndexForBody/);
  assert.match(canonical, /gyazoIndexForBody/);
});
