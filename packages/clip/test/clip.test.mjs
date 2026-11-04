import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../extension.js", import.meta.url), "utf8");

function loadClip() {
  const window = {};
  const context = vm.createContext({ window });
  vm.runInContext(script, context, { filename: "extension.js" });
  assert.equal("module" in context, false);
  assert.equal("require" in context, false);
  return context.window.weblogClip;
}

function readBack(value) {
  return JSON.parse(JSON.stringify(value));
}

function readFixture(name) {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
}

test("the package lists the three sources", () => {
  const clip = loadClip();
  assert.deepEqual(readBack(clip.SOURCE_KINDS), ["article", "tweet", "youtube"]);
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.clip_sources, ["article", "tweet", "youtube"]);
  assert.deepEqual(manifest.content_scripts[0].js, ["extension.js"]);
});

test("the browser script does not name Node loaders", () => {
  assert.equal(/\brequire\b/.test(script), false);
  assert.equal(/\bmodule\b/.test(script), false);
  const clip = loadClip();
  assert.equal(typeof clip.clipSource, "function");
  assert.equal(typeof clip.submitClip, "function");
});

for (const name of ["article", "tweet", "youtube"]) {
  test(`${name} fixture returns a bookmark payload`, () => {
    const clip = loadClip();
    const fixture = readFixture(name);
    const result = readBack(clip.clipSource(fixture));
    assert.equal(result.source, name);
    assert.equal(result.refusal, null);
    assert.equal(result.ownerWrite.kind, "bookmark");
    assert.equal(result.ownerWrite.title, fixture.title);
    assert.equal(result.ownerWrite.body, fixture.body);
    assert.equal(result.ownerWrite.visibility, fixture.visibility);
    assert.equal(result.ownerWrite.bookmarkUrl, fixture.url);
    assert.equal(result.ownerWrite.body.includes(fixture.url), false);
    assert.deepEqual(Object.keys(result.ownerWrite).sort(), [
      "body",
      "bookmarkUrl",
      "kind",
      "title",
      "visibility",
    ]);
  });

  test(`${name} fixture is stable across two transforms`, () => {
    const clip = loadClip();
    const fixture = readFixture(name);
    const first = clip.clipSource(fixture);
    const second = clip.clipSource(fixture);
    assert.notEqual(first, second);
    assert.deepEqual(readBack(first), readBack(second));
    assert.equal(readBack(first).ownerWrite.kind, "bookmark");
  });
}

test("title whitespace is normalized and extra fixture fields are dropped", () => {
  const clip = loadClip();
  const fixture = {
    source: "article",
    title: "  Example   article \n",
    body: "A paragraph the owner noticed.",
    url: "https://example.com/articles/noticed",
    visibility: "public",
    author: "ignored",
  };
  const result = readBack(clip.clipSource(fixture));
  assert.equal(result.ownerWrite.title, "Example article");
  assert.equal(result.ownerWrite.body, fixture.body);
  assert.equal(result.ownerWrite.bookmarkUrl, fixture.url);
  assert.equal(Object.hasOwn(result.ownerWrite, "author"), false);
  assert.equal(JSON.stringify(result).includes("ignored"), false);
});

test("a source outside the three returns no payload", () => {
  const clip = loadClip();
  const expected = { source: null, ownerWrite: null, refusal: "unknown_source" };
  assert.deepEqual(readBack(clip.clipSource(undefined)), expected);
  assert.deepEqual(readBack(clip.clipSource(null)), expected);
  assert.deepEqual(readBack(clip.clipSource({})), expected);
  assert.deepEqual(readBack(clip.clipSource({ source: "page" })), expected);
  assert.deepEqual(readBack(clip.clipSource({ source: "Article" })), expected);
});

test("owner-writing refusals return no payload", () => {
  const clip = loadClip();
  const base = readFixture("article");
  assert.equal(readBack(clip.clipSource({ ...base, title: "   " })).refusal, "missing_title");
  assert.equal(readBack(clip.clipSource({ ...base, title: "   " })).ownerWrite, null);
  assert.equal(readBack(clip.clipSource({ ...base, url: "  " })).refusal, "missing_bookmark_url");
  assert.equal(readBack(clip.clipSource({ ...base, url: "" })).ownerWrite, null);
  assert.equal(readBack(clip.clipSource({ ...base, body: "", visibility: "public" })).refusal, "empty_body");
  assert.equal(readBack(clip.clipSource({ ...base, visibility: "secret" })).refusal, "invalid_visibility");
  const draft = readBack(clip.clipSource({ ...base, body: "", visibility: "draft" }));
  assert.equal(draft.refusal, null);
  assert.equal(draft.ownerWrite.kind, "bookmark");
  assert.equal(draft.ownerWrite.body, "");
  assert.equal(draft.ownerWrite.visibility, "draft");
  assert.equal(draft.ownerWrite.bookmarkUrl, base.url);
});
