import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import {
  deliverableEntries,
  entryById,
  isReservedTitle,
  publicEntries,
  publicEntryByTitle,
  reservedTitles,
} from "../domain/catalog.js";

const source = new URL("..", import.meta.url);
const root = new URL("../..", import.meta.url);
const rootDir = fileURLToPath(source);

function readRoot(path) {
  return readFileSync(join(rootDir, path), "utf8");
}

const required = ["svelte", "@void/svelte", "void"];
const rejected = ["@void/react", "@void/vue", "@void/solid", "@sveltejs/adapter-cloudflare"];

function readProject(path) {
  return readFileSync(fileURLToPath(new URL(path, root)), "utf8");
}

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, root), "utf8"));
}

function declaredNames(manifest) {
  const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  return sections.flatMap((section) => Object.keys(manifest[section] ?? {}));
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".void" || name === "dist") {
      continue;
    }
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

const appSourceRoots = ["pages", "middleware", "access", "domain", "store", "db"].map(
  (name) => new URL(`${name}/`, source),
);

test("the app manifest declares the Svelte Void packages", () => {
  const manifest = readJson("package.json");
  const names = declaredNames(manifest);
  for (const name of required) {
    assert.equal(names.includes(name), true, name);
  }
  for (const name of rejected) {
    assert.equal(names.includes(name), false, name);
  }
});

test("Vite+ runs the app tasks and registers the Void Svelte plugins", () => {
  const manifest = readJson("package.json");
  for (const name of ["dev", "build", "preview", "test", "check"]) {
    assert.match(manifest.scripts[name], /^vp\s/);
  }
  const config = readFileSync(new URL("vite.config.js", root), "utf8");
  assert.match(config, /from ["']vite-plus["']/);
  assert.match(config, /from ["']@void\/svelte\/plugin["']/);
  assert.match(config, /voidSvelte\s*\(/);
  assert.match(config, /voidPlugin\s*\(/);
  assert.match(config, /from ["']void["']/);
});

test("app source does not export ssr = false", () => {
  const files = [new URL("vite.config.js", root).pathname];
  for (const dir of appSourceRoots) {
    try {
      files.push(...walk(dir.pathname));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(/export\s+(?:const|let|var)\s+ssr\s*=\s*false\b/.test(source), false, file);
  }
});

test("pages render the shipped mock and leave reserved keys off the title entry", () => {
  const catalog = readRoot("domain/catalog.js");
  assert.equal(catalog.includes("void/db"), false);
  assert.equal(/\bfrom\s+["']void["']/.test(catalog), false);
  assert.equal(catalog.includes("@void/svelte"), false);
  assert.equal(catalog.includes("svelte"), false);

  const deliverable = deliverableEntries();
  assert.equal(deliverable.length > 0, true);
  assert.equal(
    deliverable.some((entry) => entry.title === "index-only"),
    false,
  );
  const titles = publicEntries().map((entry) => entry.title);
  assert.equal(titles.includes("index-only"), true);
  assert.equal(titles.includes("draft-thought"), false);
  const sample = deliverable[0];
  assert.equal(publicEntryByTitle(sample.title).id, sample.id);
  assert.equal(publicEntryByTitle("missing-title"), null);
  assert.equal(entryById(sample.id).title, sample.title);
  assert.deepEqual(reservedTitles, [
    "e",
    "edit",
    "entries",
    "tokens",
    "feed",
    "feed.xml",
    "feed.json",
    "pages",
    "users",
    "gyazo",
    ".well-known",
  ]);
  for (const key of reservedTitles) {
    assert.equal(isReservedTitle(key), true);
  }
  assert.equal(isReservedTitle(sample.title), false);

  const titleLoader = readRoot("pages/[title].server.js");
  assert.match(titleLoader, /domain\/catalog/);
  assert.match(titleLoader, /isReservedTitle/);
  const titlePage = readRoot("pages/[title].svelte");
  assert.match(titlePage, /Empty page/);
  assert.match(titlePage, /entry\.body/);
  const homeLoader = readRoot("pages/index.server.js");
  assert.match(homeLoader, /deliverableEntries/);
  const editForm = readRoot("pages/edit/index.svelte");
  assert.match(editForm, /Create an entry/);
});

test("page files do not import void/db", () => {
  const pages = walk(new URL("pages/", source).pathname);
  assert.equal(pages.length > 0, true);
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    assert.equal(/(?:from\s+|import\s+)["']void\/db["']/.test(source), false, file);
    assert.equal(/import\s*\(\s*["']void\/db["']\s*\)/.test(source), false, file);
    assert.equal(/require\(\s*["']void\/db["']\s*\)/.test(source), false, file);
  }
});
