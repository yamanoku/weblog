// A Cosense `[Title.icon]` bracket. The stored body stays that bracket.
// The icon is the first Gyazo image in the one public entry of that title.
// When no public entry has the title, the image comes from archivedPageIcons.

// Titles whose pages are not imported. The object key is the path inside gyazo-archives.
export const archivedPageIcons: Readonly<
  Record<string, { imageId: string; extension: string; objectKey: string }>
> = {
  Copilot: {
    imageId: "81fa38a548179c43f8adb8e77d686803",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-25/81fa38a548179c43f8adb8e77d686803.png",
  },
  "ChatGPT 4o": {
    imageId: "d14f6b33536ea71303c8425d06123295",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-40/d14f6b33536ea71303c8425d06123295.png",
  },
  Grok: {
    imageId: "d477bc3a85f82618f1352027b043429d",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-39/d477bc3a85f82618f1352027b043429d.png",
  },
  DeepSRT: {
    imageId: "5749f7d1cf3d11247ac3f1a4eddfb69c",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-37/5749f7d1cf3d11247ac3f1a4eddfb69c.png",
  },
  NotebookLM: {
    imageId: "9f55e05a46d73bb4890352d2ff92e842",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-39/9f55e05a46d73bb4890352d2ff92e842.png",
  },
  Claude: {
    imageId: "1a9b94668d997980d57f2288af039c19",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-43/1a9b94668d997980d57f2288af039c19.png",
  },
  Gemini: {
    imageId: "517629f79a96128e064032c65cfff887",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-33/517629f79a96128e064032c65cfff887.png",
  },
  MCP: {
    imageId: "a664a528df5e2cbfa6c3b0cda850b72d",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-45/a664a528df5e2cbfa6c3b0cda850b72d.png",
  },
  // The Cosense pin is a scrapbox.io file. This archived Gyazo is that same mark.
  yamanoku: {
    imageId: "809a6f523937838d9ba5eaf20717feee",
    extension: "png",
    objectKey: "916c3640-cadb-40b0-a2da-8e61ec874755-1/809a6f523937838d9ba5eaf20717feee.png",
  },
};

export function archivedPageIconKey(imageId: string, extension: string): string | null {
  for (const icon of Object.values(archivedPageIcons)) {
    if (icon.imageId === imageId && icon.extension === extension) return icon.objectKey;
  }
  return null;
}

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
