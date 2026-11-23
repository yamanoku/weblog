// Turns one Cosense text/plain page into the Markdown stored for that page.

const imageExtension = /\.(png|jpe?g|gif|webp|svg)$/i;

function preservedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "gyazo.com" || host === "i.gyazo.com") return true;
    return host === "scrapbox.io" && parsed.pathname.startsWith("/files/");
  } catch {
    return false;
  }
}

function imageUrl(url: string): boolean {
  try {
    return imageExtension.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function pagePath(title: string): string {
  return `/${encodeURIComponent(title.replaceAll(" ", "_"))}`;
}

function pageLink(title: string): string {
  return `[${title}](${pagePath(title)})`;
}

function trimBareUrl(url: string): string {
  return url.replace(/[.,;:]+$/, "");
}

function convertDouble(inner: string, raw: string): string {
  const trimmed = inner.trim();
  if (/^https?:\/\//i.test(trimmed) && !/\s/.test(trimmed)) {
    if (preservedUrl(trimmed)) return raw;
    if (imageUrl(trimmed)) return `![](${trimmed})`;
    return `[${trimmed}](${trimmed})`;
  }
  return `**${convertInline(inner)}**`;
}

function decoration(inner: string): string | null {
  const match = /^(\*{1,4}|\/\*|\/|-)\s+(\S[\s\S]*)$/.exec(inner);
  if (!match?.[1] || match[2] === undefined) return null;
  const text = convertInline(match[2]);
  if (match[1] === "/") return `*${text}*`;
  if (match[1] === "-") return `~~${text}~~`;
  if (match[1] === "/*") return `***${text}***`;
  return `**${text}**`;
}

function linkLabel(tokens: string[]): string {
  return tokens.join(" ");
}

function convertSingle(inner: string, raw: string): string {
  if (inner.endsWith(".icon") || inner.startsWith("$")) return raw;
  if (inner.startsWith("/") && !/^\/\*\s+\S/.test(inner) && !/^\/\s+\S/.test(inner)) return raw;
  const decorated = decoration(inner);
  if (decorated) return decorated;
  const tokens = inner.split(/\s+/).filter((token) => token.length > 0);
  const urls = tokens.filter((token) => /^https?:\/\//i.test(token));
  if (urls.length === tokens.length && urls.length > 0) {
    if (urls.some((url) => preservedUrl(url))) return raw;
    if (urls.length === 1) {
      const url = urls[0] ?? "";
      return imageUrl(url) ? `![](${url})` : `[${url}](${url})`;
    }
    if (urls.length === 2) {
      const [first, second] = urls;
      if (first && second && imageUrl(first) && !imageUrl(second)) return `[![](${first})](${second})`;
      if (first && second && imageUrl(second) && !imageUrl(first)) return `[![](${second})](${first})`;
    }
    return raw;
  }
  if (urls.length === 1) {
    const url = urls[0] ?? "";
    if (preservedUrl(url)) return raw;
    const label = linkLabel(tokens.filter((token) => token !== url));
    if (!label) return `[${url}](${url})`;
    return `[${convertInline(label)}](${url})`;
  }
  if (!inner || inner.includes("\n")) return raw;
  return pageLink(inner);
}

function convertInline(text: string): string {
  let result = "";
  let index = 0;
  while (index < text.length) {
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        result += text.slice(index, end + 1);
        index = end + 1;
        continue;
      }
    }
    if (text.startsWith("[[", index)) {
      const end = text.indexOf("]]", index + 2);
      if (end !== -1) {
        result += convertDouble(text.slice(index + 2, end), text.slice(index, end + 2));
        index = end + 2;
        continue;
      }
    }
    if (text[index] === "[") {
      const end = text.indexOf("]", index + 1);
      if (end !== -1) {
        result += convertSingle(text.slice(index + 1, end), text.slice(index, end + 1));
        index = end + 1;
        continue;
      }
    }
    if (text[index] === "#" && (index === 0 || /\s/.test(text[index - 1] ?? ""))) {
      const match = /^#([^\s[\]]+)/.exec(text.slice(index));
      if (match?.[1]) {
        result += pageLink(match[1]);
        index += match[0].length;
        continue;
      }
    }
    if (text.startsWith("http://", index) || text.startsWith("https://", index)) {
      const match = /^https?:\/\/\S+/.exec(text.slice(index));
      if (match?.[0]) {
        const url = trimBareUrl(match[0]);
        result += preservedUrl(url) ? url : `[${url}](${url})`;
        result += match[0].slice(url.length);
        index += match[0].length;
        continue;
      }
    }
    result += text[index] ?? "";
    index += 1;
  }
  return result;
}

function indentOf(line: string): number {
  return /^[ \t]*/.exec(line)?.[0].length ?? 0;
}

function stripOne(line: string): string {
  if (line.startsWith("\t")) return line.slice(1);
  if (line.startsWith(" ")) return line.slice(1);
  return line;
}

function fence(info: string, body: string[]): string {
  const longest = body.reduce((size, line) => {
    const match = /^(`+)/.exec(line);
    return Math.max(size, match?.[1]?.length ?? 0);
  }, 0);
  const marker = "`".repeat(Math.max(3, longest + 1));
  const opened = info ? `${marker}${info}` : marker;
  return [opened, ...body, marker].join("\n");
}

function pipeCell(cell: string): string {
  return cell.replaceAll("|", "\\|");
}

function pipeRow(cells: string[]): string {
  return `| ${cells.map(pipeCell).join(" | ")} |`;
}

function convertLine(content: string): string {
  const level = indentOf(content);
  const rest = content.slice(level);
  const text = rest.startsWith(">")
    ? `> ${convertInline(rest.replace(/^>\s?/, ""))}`
    : convertInline(rest);
  if (level === 0) return text;
  return `${"  ".repeat(level - 1)}- ${text}`;
}

function sameRun(previous: string, block: string): boolean {
  const list = /^( *)- /;
  if (list.test(previous) && list.test(block)) return true;
  return previous.startsWith("> ") && block.startsWith("> ");
}

function pushBlock(out: string[], block: string): void {
  if (block === "") {
    if (out.at(-1) !== "") out.push("");
    return;
  }
  const previous = out.at(-1);
  if (previous !== undefined && previous !== "" && !sameRun(previous, block)) out.push("");
  out.push(block);
}

export function cosenseTextToMarkdown(source: string): string {
  const lines = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const code = /^(\t*)code:(.*)$/.exec(line);
    if (code) {
      const depth = code[1]?.length ?? 0;
      const info = (code[2] ?? "").trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length) {
        const current = lines[index] ?? "";
        if (current === "") break;
        if (indentOf(current) <= depth && !/^[\t ]/.test(current)) break;
        if (!/^[\t ]/.test(current)) break;
        body.push(stripOne(current));
        index += 1;
      }
      pushBlock(out, fence(info, body));
      continue;
    }
    const table = /^(\t*)table:(.*)$/.exec(line);
    if (table) {
      const depth = table[1]?.length ?? 0;
      const name = (table[2] ?? "").trim();
      const rows: string[][] = [];
      index += 1;
      while (index < lines.length) {
        const current = lines[index] ?? "";
        if (current === "" || !current.startsWith("\t") || indentOf(current) <= depth) break;
        rows.push(current.slice(depth + 1).split("\t"));
        index += 1;
      }
      if (rows.length === 0) {
        pushBlock(out, convertLine(line));
        continue;
      }
      const [header, ...rest] = rows;
      const markdownTable = [
        name ? `Table: ${name}` : "",
        pipeRow(header ?? []),
        pipeRow((header ?? []).map(() => "---")),
        ...rest.map((row) => pipeRow(row)),
      ]
        .filter((row) => row !== "")
        .join("\n");
      pushBlock(out, markdownTable);
      continue;
    }
    pushBlock(out, convertLine(line));
    index += 1;
  }
  return out.join("\n");
}
