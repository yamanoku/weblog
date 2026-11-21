import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { isReservedTitle } from "../domain/catalog.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));
const origin = "https://weblog.yamanoku.net";
const installDisplays = new Set(["standalone", "fullscreen", "minimal-ui", "window-controls-overlay"]);

type IconMember = {
  src?: string;
  sizes?: string;
  type?: string;
  purpose?: string;
};

function read(path: string) {
  return readFileSync(path);
}

function pngSize(bytes: Buffer) {
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function webpSize(bytes: Buffer) {
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (kind === "VP8X" && start + 10 <= bytes.length) {
      return {
        width: 1 + bytes.readUIntLE(start + 4, 3),
        height: 1 + bytes.readUIntLE(start + 7, 3),
      };
    }
    if (kind === "VP8 " && start + 10 <= bytes.length) {
      return {
        width: bytes.readUInt16LE(start + 6) & 0x3fff,
        height: bytes.readUInt16LE(start + 8) & 0x3fff,
      };
    }
    if (kind === "VP8L" && start + 5 <= bytes.length) {
      const bits = bytes.readUInt32LE(start + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    offset = start + size + (size % 2);
  }
  assert.fail("WebP has no dimension chunk");
}

function withinScope(start: URL, scope: URL) {
  if (start.origin !== scope.origin) return false;
  if (scope.pathname === "/") return true;
  const prefix = scope.pathname.endsWith("/") ? scope.pathname : `${scope.pathname}/`;
  return start.pathname === scope.pathname || start.pathname.startsWith(prefix);
}

function purposeAllowsAny(purpose: string | undefined) {
  if (purpose === undefined) return true;
  return purpose.split(/\s+/).includes("any");
}

function covers(icon: IconMember, size: number) {
  const sizes = typeof icon.sizes === "string" ? icon.sizes.split(/\s+/) : [];
  return sizes.includes(`${size}x${size}`) && purposeAllowsAny(icon.purpose);
}

function assertIconBytes(bytes: Buffer, type: string | undefined, width: number, height: number) {
  if (type === "image/png") {
    assert.deepEqual(pngSize(bytes), { width, height });
    return;
  }
  if (type === "image/webp") {
    assert.deepEqual(webpSize(bytes), { width, height });
    return;
  }
  if (type === "image/svg+xml") {
    const text = bytes.toString("utf8").trim();
    assert.match(text, /^<svg[\s>]/);
    assert.equal(text.includes("</svg>"), true);
    return;
  }
  assert.fail(`icon type ${type ?? "missing"} is not PNG, WebP, or SVG`);
}

test("the shared page shell links the installable manifest and its icons", () => {
  const layout = readFileSync(join(root, "src/pages/layout.svelte"), "utf8");
  const headStart = layout.indexOf("<svelte:head>");
  const headEnd = layout.indexOf("</svelte:head>");
  assert.equal(headStart >= 0 && headEnd > headStart, true);
  const head = layout.slice(headStart, headEnd);
  const link = head.match(/<link\b[^>]*\brel="manifest"[^>]*>/);
  assert.ok(link, "svelte:head links rel=manifest");
  const hrefMatch = link[0].match(/\bhref="([^"]+)"/);
  assert.ok(hrefMatch);
  const href = hrefMatch[1];
  assert.equal(href.startsWith("/"), true);
  assert.equal(href.includes("packages/clip"), false);

  const manifestUrl = new URL(href, `${origin}/`);
  const manifestPath = join(root, "public", decodeURIComponent(manifestUrl.pathname).replace(/^\//, ""));
  const manifest = JSON.parse(read(manifestPath).toString("utf8")) as {
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    display_override?: string[];
    prefer_related_applications?: boolean;
    icons?: IconMember[];
  };

  const named =
    (typeof manifest.name === "string" && manifest.name.length > 0) ||
    (typeof manifest.short_name === "string" && manifest.short_name.length > 0);
  assert.equal(named, true);

  assert.equal(typeof manifest.start_url, "string");
  const scope = new URL(manifest.scope ?? "./", manifestUrl);
  const start = new URL(manifest.start_url, manifestUrl);
  assert.equal(start.origin, origin);
  assert.equal(start.pathname, "/");
  assert.equal(withinScope(start, scope), true);

  const display = manifest.display;
  const override = Array.isArray(manifest.display_override) ? manifest.display_override : [];
  const installableDisplay =
    (typeof display === "string" && installDisplays.has(display)) ||
    override.some((value) => installDisplays.has(value));
  assert.equal(installableDisplay, true);
  assert.notEqual(display, "browser");
  if (manifest.prefer_related_applications !== undefined) {
    assert.equal(manifest.prefer_related_applications, false);
  }

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  for (const size of [192, 512]) {
    const icon = icons.find((item) => covers(item, size));
    assert.ok(icon, `manifest names a ${size}px icon`);
    const iconUrl = new URL(icon.src ?? "", manifestUrl);
    assert.equal(iconUrl.origin, origin);
    const file = join(root, "public", decodeURIComponent(iconUrl.pathname).replace(/^\//, ""));
    const bytes = read(file);
    assert.equal(bytes.subarray(0, 1).toString("utf8") === "<" && bytes.includes(Buffer.from("html")), false);
    assertIconBytes(bytes, icon.type, size, size);
  }

  assert.equal(layout.includes("serviceWorker"), false);
  assert.equal(isReservedTitle("manifest.webmanifest"), true);
});
