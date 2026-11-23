import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { test } from "vitest";
import { entries, gyazoObjects } from "../db/schema.ts";
import { markdownToHtml } from "../domain/markdown-html.ts";
import { firstGyazoIcon, iconTitles, pageIconSrc } from "../domain/page-icon.ts";
import { pageIconsForBody } from "../store/page-icons.ts";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const copilotId = "81fa38a548179c43f8adb8e77d686803";
const copilotSrc = `https://weblog.yamanoku.net/gyazo/${copilotId}.png`;

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
  return drizzle(sqlite);
}

test("icon titles skip code, and the first gyazo image is the page icon", () => {
  assert.deepEqual(iconTitles("see [Copilot.icon] and [Copilot.icon]\n`[GitHub.icon]`\n```\n[Hidden.icon]\n```"), [
    "Copilot",
  ]);
  assert.deepEqual(firstGyazoIcon(`[https://gyazo.com/${copilotId}]`), {
    imageId: copilotId,
    extension: null,
  });
  assert.equal(
    firstGyazoIcon(`![](https://pbs.twimg.com/media/x.jpg)\n[https://gyazo.com/${copilotId}]`),
    null,
  );
  assert.equal(firstGyazoIcon("```\nhttps://gyazo.com/hidden\n```\nno image"), null);
  assert.equal(pageIconSrc({ imageId: copilotId, extension: null }, ["png", "mp4"]), copilotSrc);
  assert.equal(pageIconSrc({ imageId: copilotId, extension: null }, ["png", "jpg"]), null);
  assert.equal(pageIconSrc({ imageId: copilotId, extension: "png" }, ["jpg"]), null);
});

test("a resolved page icon is an image from the gyazo archive", () => {
  const icons = { Copilot: { href: "/Copilot", src: copilotSrc } };
  const html = markdownToHtml("see [Copilot.icon] now", {}, {}, icons);
  assert.match(
    html,
    new RegExp(
      `<a href="/Copilot"><img class="page-icon" src="${copilotSrc}" alt="Copilot" width="20" height="20" loading="lazy"></a>`,
    ),
  );
  assert.equal(markdownToHtml("[Missing.icon]", {}, {}, icons).includes("<img"), false);
  assert.match(markdownToHtml("[Missing.icon]", {}, {}, icons), /\[Missing\.icon\]/);
  assert.equal(markdownToHtml("```\n[Copilot.icon]\n```", {}, {}, icons).includes("page-icon"), false);
  assert.match(markdownToHtml("`[Copilot.icon]`", {}, {}, icons), /<code>\[Copilot\.icon\]<\/code>/);
});

test("a public page icon uses the first gyazo image and the archive index", async () => {
  const database = applyShippedMigrations();
  const now = "2026-11-23T00:00:00.000Z";
  await database.insert(entries).values({
    id: "page-copilot",
    kind: "page",
    title: "Copilot",
    body: `[https://gyazo.com/${copilotId}]`,
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    viewPath: "Copilot",
  });
  await database.insert(entries).values({
    id: "page-draft",
    kind: "page",
    title: "Draft Icon",
    body: `[https://gyazo.com/${copilotId}]`,
    visibility: "draft",
    createdAt: now,
    updatedAt: now,
    viewPath: null,
  });
  await database.insert(entries).values({
    id: "page-other",
    kind: "page",
    title: "Photo",
    body: `![](https://pbs.twimg.com/media/x.jpg)\n[https://gyazo.com/${copilotId}]`,
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    viewPath: "Photo",
  });
  await database.insert(gyazoObjects).values([
    { imageId: copilotId, extension: "png", objectKey: `${copilotId}.png` },
    { imageId: copilotId, extension: "mp4", objectKey: `${copilotId}.mp4` },
  ]);
  const icons = await pageIconsForBody(
    database,
    "use [Copilot.icon] and [Draft Icon.icon] and [Photo.icon] and [Absent.icon]",
  );
  assert.deepEqual(icons, { Copilot: { href: "/Copilot", src: copilotSrc } });
  const title = readFileSync(join(rootDir, "pages/[title].server.ts"), "utf8");
  const canonical = readFileSync(join(rootDir, "pages/e/[id].server.ts"), "utf8");
  assert.match(title, /pageIconsForBody/);
  assert.match(canonical, /pageIconsForBody/);
});
