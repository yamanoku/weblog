import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url);

const required = ["svelte", "@void/svelte", "void"];
const rejected = [
  "@void/react",
  "@void/vue",
  "@void/solid",
  "@sveltejs/adapter-cloudflare",
];

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, root), "utf8"));
}

function declaredNames(manifest) {
  const sections = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];
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

const appSourceRoots = ["pages", "routes", "src", "middleware"].map((name) =>
  new URL(`${name}/`, root),
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

test("Vite registers voidPlugin and voidSvelte from @void/svelte/plugin", () => {
  const config = readFileSync(new URL("vite.config.js", root), "utf8");
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

test("page files do not import void/db", () => {
  const pages = walk(new URL("pages/", root).pathname);
  assert.equal(pages.length > 0, true);
  for (const file of pages) {
    const source = readFileSync(file, "utf8");
    assert.equal(/(?:from\s+|import\s+)["']void\/db["']/.test(source), false, file);
    assert.equal(/import\s*\(\s*["']void\/db["']\s*\)/.test(source), false, file);
    assert.equal(/require\(\s*["']void\/db["']\s*\)/.test(source), false, file);
  }
});
