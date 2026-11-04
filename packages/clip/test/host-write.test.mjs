import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("../extension.js", import.meta.url), "utf8");

function loadClip() {
  const window = {};
  const context = vm.createContext({ window });
  vm.runInContext(script, context, { filename: "extension.js" });
  return context.window.weblogClip;
}

function readBack(value) {
  return JSON.parse(JSON.stringify(value));
}

function readFixture(name) {
  return JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));
}

test("a decided clip payload is stored only with the CLI token", () => {
  const clip = loadClip();
  for (const name of ["article", "tweet", "youtube"]) {
    const fixture = readFixture(name);
    const result = readBack(clip.clipSource(fixture));
    assert.equal(result.ownerWrite.kind, "bookmark");
    const store = [{ id: "already-there" }];

    const missing = readBack(clip.submitClip(result, undefined, store));
    assert.deepEqual(missing, { stored: false, reason: "unauthorized", count: 1 });
    assert.deepEqual(store, [{ id: "already-there" }]);

    const emptyToken = readBack(clip.submitClip(result, { token: "" }, store));
    assert.equal(emptyToken.stored, false);
    assert.equal(emptyToken.reason, "unauthorized");
    assert.equal(store.length, 1);

    const accepted = readBack(clip.submitClip(result, { token: "owner-cli-token" }, store));
    assert.deepEqual(accepted, { stored: true, reason: "stored", count: 2 });
    assert.deepEqual(readBack(store[1]), {
      kind: "bookmark",
      title: fixture.title,
      body: fixture.body,
      visibility: fixture.visibility,
      bookmarkUrl: fixture.url,
    });
    assert.equal(JSON.stringify(store).includes("owner-cli-token"), false);
    assert.equal(Object.hasOwn(readBack(store[1]), "source"), false);
  }
});

test("a refused clip stores nothing even with a CLI token", () => {
  const clip = loadClip();
  const fixture = readFixture("article");
  const refused = readBack(clip.clipSource({ ...fixture, title: " " }));
  assert.equal(refused.ownerWrite, null);
  const store = [];
  const withToken = readBack(clip.submitClip(refused, { token: "owner-cli-token" }, store));
  assert.deepEqual(withToken, { stored: false, reason: "no_payload", count: 0 });
  assert.deepEqual(store, []);
});
