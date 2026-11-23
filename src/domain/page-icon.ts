// A Cosense `[Title.icon]` bracket. The stored body stays that bracket.
// The icon is the first Gyazo image in the public entry of that title.

import { gyazoPublicOrigin, parseGyazoUrl } from "./gyazo.ts";

export type PageIconImage = { imageId: string; extension: string | null };

export type PageIcon = { href: string; src: string };

export type PageIconIndex = Readonly<Record<string, PageIcon>>;

const stillExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

function lineAt(text: string, index: number): { line: string; next: number } {
  const newline = text.indexOf("\n", index);
  if (newline === -1) return { line: text.slice(index), next: text.length };
  return { line: text.slice(index, newline), next: newline + 1 };
}

// Titles of `[Title.icon]` brackets outside inline code and fenced code.
export function iconTitles(source: string): string[] {
  const text = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const titles: string[] = [];
  const seen = new Set<string>();
  let index = 0;
  let fence: number | null = null;
  while (index < text.length) {
    const atLine = index === 0 || text[index - 1] === "\n";
    if (fence !== null) {
      const current = lineAt(text, index);
      const size = /^(`+)/.exec(current.line)?.[1]?.length ?? 0;
      index = current.next;
      if (size >= fence && current.line.trim() === "`".repeat(size)) fence = null;
      continue;
    }
    if (atLine && text.startsWith("```", index)) {
      const current = lineAt(text, index);
      fence = /^(```+)/.exec(current.line)?.[1]?.length ?? 3;
      index = current.next;
      continue;
    }
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        index = end + 1;
        continue;
      }
    }
    const match = /^\[([^\]\n]+)\]/.exec(text.slice(index));
    if (match?.[1] && text[index + match[0].length] !== "(" && match[1].endsWith(".icon")) {
      const title = match[1].slice(0, -".icon".length);
      if (title.length > 0 && !seen.has(title)) {
        seen.add(title);
        titles.push(title);
      }
      index += match[0].length;
      continue;
    }
    index += 1;
  }
  return titles;
}

// The first displayed image, when it is a Gyazo URL. A Markdown image that is
// not Gyazo means the page icon is not a Gyazo image.
export function firstGyazoIcon(source: string): PageIconImage | null {
  const text = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  let index = 0;
  let fence: number | null = null;
  while (index < text.length) {
    const atLine = index === 0 || text[index - 1] === "\n";
    if (fence !== null) {
      const current = lineAt(text, index);
      const size = /^(`+)/.exec(current.line)?.[1]?.length ?? 0;
      index = current.next;
      if (size >= fence && current.line.trim() === "`".repeat(size)) fence = null;
      continue;
    }
    if (atLine && text.startsWith("```", index)) {
      const current = lineAt(text, index);
      fence = /^(```+)/.exec(current.line)?.[1]?.length ?? 3;
      index = current.next;
      continue;
    }
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        index = end + 1;
        continue;
      }
    }
    const rest = text.slice(index);
    const linkedImage = /^\[!\[([^\]]*)\]\(([^)\s]+)\)\]/.exec(rest);
    if (linkedImage?.[2]) return parseGyazoUrl(linkedImage[2]);
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (image?.[2]) return parseGyazoUrl(image[2]);
    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link?.[2]) {
      const parsed = parseGyazoUrl(link[2]);
      if (parsed) return parsed;
      index += link[0].length;
      continue;
    }
    const bracket = /^\[(\s*https?:\/\/[^\]\s]+\s*)\]/.exec(rest);
    if (bracket?.[1] && rest[bracket[0].length] !== "(") {
      const parsed = parseGyazoUrl(bracket[1].trim());
      if (parsed) return parsed;
    }
    const bare = /^https?:\/\/[^\s<>)\]]+/.exec(rest);
    if (bare?.[0]) {
      const trimmed = bare[0].replace(/[.,;:]+$/, "");
      const parsed = parseGyazoUrl(trimmed);
      if (parsed) return parsed;
      index += bare[0].length;
      continue;
    }
    index += 1;
  }
  return null;
}

// One still image in the Gyazo index. An mp4 beside one still image is the still image.
export function pageIconSrc(image: PageIconImage, extensions: readonly string[]): string | null {
  const stills = extensions.filter((extension) => stillExtensions.has(extension));
  const chosen = image.extension
    ? stills.includes(image.extension)
      ? image.extension
      : null
    : stills.length === 1
      ? (stills[0] ?? null)
      : null;
  if (!chosen) return null;
  return `${gyazoPublicOrigin}/gyazo/${encodeURIComponent(image.imageId)}.${chosen}`;
}
