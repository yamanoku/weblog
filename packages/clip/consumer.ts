import { readFileSync } from "node:fs";
import vm from "node:vm";

type OwnerWrite = {
  kind: string;
  bookmarkUrl: string;
  title: string;
  body: string;
  visibility: string;
};

type WeblogClip = {
  clipSource: (fixture: unknown) => { ownerWrite: OwnerWrite | null };
};

const script = readFileSync(new URL("./extension.js", import.meta.url), "utf8");
const window: { weblogClip?: WeblogClip } = {};
const context = vm.createContext({ window });
vm.runInContext(script, context, { filename: "extension.js" });
if ("module" in context || "require" in context) {
  throw new Error("browser script saw Node loaders");
}

const clip = window.weblogClip;
if (!clip) throw new Error("window.weblogClip missing");
const fixture = JSON.parse(readFileSync(new URL("./fixtures/article.json", import.meta.url), "utf8")) as {
  url: string;
  title: string;
  body: string;
  visibility: string;
};
const first = clip.clipSource(fixture);
const second = clip.clipSource(fixture);
const encoded = JSON.stringify(first);
if (encoded !== JSON.stringify(second)) {
  throw new Error("transform changed between launches");
}
const payload = first.ownerWrite;
if (!payload || payload.kind !== "bookmark" || payload.bookmarkUrl !== fixture.url || payload.title !== fixture.title || payload.body !== fixture.body || payload.visibility !== fixture.visibility) {
  throw new Error(`payload missing ${encoded}`);
}
if (payload.body.includes(fixture.url)) {
  throw new Error("bookmark URL was copied into the body");
}
process.stdout.write(`${encoded}\n`);
