// Public entries joined by a page link in either direction.
// A page link is a Markdown path link. Reading does not write an edge.

import { publicArticleHref } from "./public-article.ts";

const lineIdSuffix = /#[0-9a-fA-F]{24}$/;

export type RelatedSource = {
  id: string;
  title: string;
  body: string;
  viewPath: string | null;
  updatedAt: string;
};

export type RelatedLink = {
  id: string;
  href: string;
  text: string;
};

// Titles are compared after trimming and collapsing whitespace. A Cosense line id is not part of the title.
export function normalizeLinkTitle(label: string): string {
  const collapsed = label.trim().replace(/\s+/g, " ");
  return collapsed.replace(lineIdSuffix, "").trim().replace(/\s+/g, " ");
}

// Path forms stored for a title: spaces as underscores, and that path percent-encoded.
export function titlePathNeedles(title: string): string[] {
  const name = normalizeLinkTitle(title);
  if (name.length === 0) return [];
  const path = name.replaceAll(" ", "_");
  const encoded = encodeURIComponent(path);
  const hrefs = path === encoded ? [path] : [path, encoded];
  const needles = new Set<string>();
  for (const href of hrefs) {
    needles.add(`](/${href})`);
    needles.add(`](/${href}#`);
  }
  needles.add(`[${name}](/`);
  return [...needles];
}

function markdownPathLink(
  source: string,
  index: number,
): { label: string; url: string; end: number } | null {
  if (source[index] !== "[") return null;
  let depth = 1;
  let cursor = index + 1;
  while (cursor < source.length && depth > 0) {
    if (source[cursor] === "[") depth += 1;
    else if (source[cursor] === "]") depth -= 1;
    if (depth > 0) cursor += 1;
  }
  if (depth !== 0 || source[cursor + 1] !== "(") return null;
  const urlEnd = source.indexOf(")", cursor + 2);
  if (urlEnd === -1) return null;
  return {
    label: source.slice(index + 1, cursor),
    url: source.slice(cursor + 2, urlEnd),
    end: urlEnd + 1,
  };
}

function linkTitlesInText(text: string): string[] {
  const titles: string[] = [];
  let index = 0;
  while (index < text.length) {
    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        index = end + 1;
        continue;
      }
    }
    if (text[index] === "[" && text[index - 1] !== "!") {
      const found = markdownPathLink(text, index);
      if (found) {
        const url = found.url.trim();
        if (url.startsWith("/") && !url.startsWith("//")) {
          const title = normalizeLinkTitle(found.label);
          if (title.length > 0) titles.push(title);
        }
        index = found.end;
        continue;
      }
    }
    index += 1;
  }
  return titles;
}

function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === "\\" && trimmed[index + 1] === "|") {
      current += "|";
      index += 1;
      continue;
    }
    if (trimmed[index] === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += trimmed[index] ?? "";
  }
  cells.push(current.trim());
  return cells;
}

function isSeparator(line: string): boolean {
  if (!line.includes("-")) return false;
  const cells = splitCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableAt(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  return line.includes("|") && isSeparator(lines[index + 1] ?? "");
}

function skipTable(lines: string[], index: number): number {
  let cursor = index + 2;
  while (cursor < lines.length) {
    const line = lines[cursor] ?? "";
    if (line.trim() === "" || !line.includes("|") || isSeparator(line)) break;
    if (line.startsWith("```") || /^(#{1,6}) /.test(line) || line.startsWith(">")) break;
    cursor += 1;
  }
  return cursor;
}

function skipFence(lines: string[], index: number, open: number): number {
  let cursor = index + 1;
  while (cursor < lines.length) {
    const current = lines[cursor] ?? "";
    const size = /^(`+)/.exec(current)?.[1]?.length ?? 0;
    if (size >= open && current.trim() === "`".repeat(size)) return cursor + 1;
    cursor += 1;
  }
  return cursor;
}

// Page-link titles in body order. Fenced code, inline code, and pipe tables are not links.
export function pageLinkTitles(body: string): string[] {
  const lines = body.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const titles: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const open = /^(```+)/.exec(line)?.[1]?.length ?? 3;
      index = skipFence(lines, index, open);
      continue;
    }
    if (/^Table: \S/.test(line) && isTableAt(lines, index + 1)) {
      index = skipTable(lines, index + 1);
      continue;
    }
    if (isTableAt(lines, index)) {
      index = skipTable(lines, index);
      continue;
    }
    const item = /^( *)([-*]) (.*)$/.exec(line);
    const fenced = item?.[3] ? /^(`{3,})/.exec(item[3]) : null;
    if (fenced?.[1]) {
      const open = fenced[1].length;
      index += 1;
      while (index < lines.length) {
        const current = lines[index] ?? "";
        if (current.trim() === "") break;
        const trimmed = current.trim();
        const size = /^(`+)$/.exec(trimmed)?.[1]?.length ?? 0;
        index += 1;
        if (size >= open && trimmed === "`".repeat(size)) break;
      }
      continue;
    }
    titles.push(...linkTitlesInText(line));
    index += 1;
  }
  return titles;
}

function relatedHref(row: RelatedSource): string {
  if (row.viewPath && row.viewPath.length > 0) return `/${encodeURIComponent(row.viewPath)}`;
  return publicArticleHref({ id: row.id, title: row.title });
}

function relatedText(row: RelatedSource): string {
  if (row.title.trim().length > 0) return row.title;
  return `https://weblog.yamanoku.net/e/${row.id}`;
}

function byUpdatedThenId(left: RelatedSource, right: RelatedSource): number {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt < right.updatedAt ? 1 : -1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

// Outgoing links stay in first-seen order. Inbound pages that are not already listed follow.
export function relatedPageLinks(
  subject: { id: string; title: string; body: string },
  resolve: (title: string) => RelatedSource | null,
  inbound: readonly RelatedSource[],
): RelatedLink[] {
  const seen = new Set<string>();
  const links: RelatedLink[] = [];
  const push = (row: RelatedSource | null | undefined) => {
    if (!row || row.id === subject.id || seen.has(row.id)) return;
    seen.add(row.id);
    links.push({ id: row.id, href: relatedHref(row), text: relatedText(row) });
  };
  for (const title of pageLinkTitles(subject.body)) push(resolve(title));
  const pointing = inbound
    .filter(
      (row) =>
        row.id !== subject.id &&
        pageLinkTitles(row.body).some((title) => resolve(title)?.id === subject.id),
    )
    .sort(byUpdatedThenId);
  for (const row of pointing) push(row);
  return links;
}
