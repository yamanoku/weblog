// Public HTML for a Gyazo URL. The stored body keeps the original URL.

export type GyazoIndex = Readonly<Record<string, readonly string[]>>;

export const gyazoPublicOrigin = "https://weblog.yamanoku.net";

const gyazoHosts = new Set(["gyazo.com", "i.gyazo.com"]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

const contentTypes: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
};

export function parseGyazoUrl(value: string): { imageId: string; extension: string | null } | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!gyazoHosts.has(url.hostname.toLowerCase())) return null;
  const segment = url.pathname.split("/").filter((part) => part.length > 0)[0];
  if (!segment) return null;
  const extension = /^([\s\S]*?)\.([A-Za-z0-9]+)$/.exec(segment);
  if (extension?.[1] && extension[2]) {
    return { imageId: extension[1], extension: extension[2].toLowerCase() };
  }
  return { imageId: segment, extension: null };
}

// `GET /gyazo/{imageId}.{extension}` uses one path segment. The extension lookup is lowercase.
export function parseGyazoPath(file: string): { imageId: string; extension: string } | null {
  const match = /^([A-Za-z0-9]+)\.([A-Za-z0-9]+)$/.exec(file);
  if (!match?.[1] || !match[2]) return null;
  return { imageId: match[1], extension: match[2].toLowerCase() };
}

export function gyazoContentType(extension: string, stored: string | null): string {
  const given = stored?.trim() ?? "";
  if (given.length > 0) return given;
  return contentTypes[extension.toLowerCase()] ?? "application/octet-stream";
}

function chosenExtension(
  parsed: { imageId: string; extension: string | null },
  index: GyazoIndex,
): string | null {
  const rows = index[parsed.imageId] ?? [];
  if (parsed.extension) return rows.includes(parsed.extension) ? parsed.extension : null;
  if (rows.length === 1) return rows[0] ?? null;
  return null;
}

function gyazoReplacement(original: string, index: GyazoIndex): string {
  const parsed = parseGyazoUrl(original);
  const extension = parsed ? chosenExtension(parsed, index) : null;
  if (!parsed || !extension) return `[${original}](${original})`;
  const hostUrl = `${gyazoPublicOrigin}/gyazo/${encodeURIComponent(parsed.imageId)}.${extension}`;
  if (imageExtensions.has(extension) || extension === "mp4") return `![${original}](${hostUrl})`;
  return `[${hostUrl}](${hostUrl})`;
}

function lineAt(text: string, index: number): { line: string; next: number } {
  const newline = text.indexOf("\n", index);
  if (newline === -1) return { line: text.slice(index), next: text.length };
  return { line: text.slice(index, newline), next: newline + 1 };
}

// A Cosense bracket of a Gyazo URL and one other URL. The image links to that other URL.
function gyazoLinkBracket(rest: string): { gyazo: string; link: string; gyazoFirst: boolean; raw: string } | null {
  const match = /^\[([^\]\n]+)\]/.exec(rest);
  const inner = match?.[1];
  if (!match || inner === undefined || rest[match[0].length] === "(") return null;
  const tokens = inner.trim().split(/\s+/).filter((token) => token.length > 0);
  const first = tokens[0];
  const second = tokens[1];
  if (tokens.length !== 2 || !first || !second) return null;
  if (!/^https?:\/\//i.test(first) || !/^https?:\/\//i.test(second)) return null;
  const firstGyazo = parseGyazoUrl(first) !== null;
  const secondGyazo = parseGyazoUrl(second) !== null;
  if (firstGyazo === secondGyazo) return null;
  return firstGyazo
    ? { gyazo: first, link: second, gyazoFirst: true, raw: match[0] }
    : { gyazo: second, link: first, gyazoFirst: false, raw: match[0] };
}

// Fenced code and inline code stay source text. A kept Gyazo URL becomes an external link.
function replaceGyazoUrls(source: string, replace: (url: string) => string | null): string {
  const text = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  let result = "";
  let index = 0;
  let fence: number | null = null;
  while (index < text.length) {
    const atLine = index === 0 || text[index - 1] === "\n";
    if (fence !== null) {
      const current = lineAt(text, index);
      const size = /^(`+)/.exec(current.line)?.[1]?.length ?? 0;
      result += text.slice(index, current.next);
      index = current.next;
      if (size >= fence && current.line.trim() === "`".repeat(size)) fence = null;
      continue;
    }
    if (atLine && text.startsWith("```", index)) {
      const current = lineAt(text, index);
      fence = /^(```+)/.exec(current.line)?.[1]?.length ?? 3;
      result += text.slice(index, current.next);
      index = current.next;
      continue;
    }
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        result += text.slice(index, end + 1);
        index = end + 1;
        continue;
      }
    }
    const rest = text.slice(index);
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (image?.[2] && parseGyazoUrl(image[2])) {
      result += replace(image[2]) ?? image[0];
      index += image[0].length;
      continue;
    }
    const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (link?.[2] && parseGyazoUrl(link[2])) {
      result += replace(link[2]) ?? link[0];
      index += link[0].length;
      continue;
    }
    const pair = gyazoLinkBracket(rest);
    if (pair) {
      const media = replace(pair.gyazo) ?? `[${pair.gyazo}](${pair.gyazo})`;
      const other = `[${pair.link}](${pair.link})`;
      result += media.startsWith("![")
        ? `[${media}](${pair.link})`
        : pair.gyazoFirst
          ? `${media}${other}`
          : `${other}${media}`;
      index += pair.raw.length;
      continue;
    }
    const bracket = /^\[(\s*https?:\/\/[^\]\s]+\s*)\]/.exec(rest);
    if (bracket?.[1] && rest[bracket[0].length] !== "(" && parseGyazoUrl(bracket[1].trim())) {
      result += replace(bracket[1].trim()) ?? bracket[0];
      index += bracket[0].length;
      continue;
    }
    const bare = /^https?:\/\/[^\s<>)\]]+/.exec(rest);
    if (bare?.[0]) {
      const trimmed = bare[0].replace(/[.,;:]+$/, "");
      if (parseGyazoUrl(trimmed)) {
        result += replace(trimmed) ?? trimmed;
        index += trimmed.length;
        continue;
      }
      result += bare[0];
      index += bare[0].length;
      continue;
    }
    result += text[index] ?? "";
    index += 1;
  }
  return result;
}

export function gyazoMarkdown(source: string, index: GyazoIndex): string {
  return replaceGyazoUrls(source, (url) => gyazoReplacement(url, index));
}

export function gyazoImageIds(source: string): string[] {
  const ids = new Set<string>();
  replaceGyazoUrls(source, (url) => {
    const parsed = parseGyazoUrl(url);
    if (parsed) ids.add(parsed.imageId);
    return null;
  });
  return [...ids];
}
