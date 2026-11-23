import { gyazoMarkdown, type GyazoIndex } from "./gyazo.ts";
import { mediaEmbedHtml } from "./media-embed.ts";

// Renders a stored article body as HTML. The stored string stays unchanged.

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  return null;
}

function isMp4(url: string): boolean {
  try {
    const path = url.startsWith("/") ? url : new URL(url).pathname;
    return path.toLowerCase().endsWith(".mp4");
  } catch {
    return false;
  }
}

function renderInline(source: string): string {
  let html = "";
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("~~", index)) {
      const end = source.indexOf("~~", index + 2);
      if (end !== -1) {
        html += `<del>${renderInline(source.slice(index + 2, end))}</del>`;
        index = end + 2;
        continue;
      }
    }
    if (source.startsWith("***", index)) {
      const end = source.indexOf("***", index + 3);
      if (end !== -1) {
        html += `<strong><em>${renderInline(source.slice(index + 3, end))}</em></strong>`;
        index = end + 3;
        continue;
      }
    }
    if (source.startsWith("`", index)) {
      const end = source.indexOf("`", index + 1);
      if (end !== -1) {
        html += `<code>${escapeHtml(source.slice(index + 1, end))}</code>`;
        index = end + 1;
        continue;
      }
    }
    if (source.startsWith("**", index)) {
      const end = source.indexOf("**", index + 2);
      if (end !== -1) {
        html += `<strong>${renderInline(source.slice(index + 2, end))}</strong>`;
        index = end + 2;
        continue;
      }
    }
    if (source[index] === "*") {
      const end = source.indexOf("*", index + 1);
      if (end > index + 1) {
        html += `<em>${renderInline(source.slice(index + 1, end))}</em>`;
        index = end + 1;
        continue;
      }
    }
    if (source.startsWith("[![", index)) {
      const linked = /^\[!\[([^\]]*)\]\(([^)\s]+)\)\]\(([^)\s]+)\)/.exec(source.slice(index));
      const src = linked?.[2] ? safeUrl(linked[2]) : null;
      const href = linked?.[3] ? safeUrl(linked[3]) : null;
      if (linked && src && href) {
        const alt = linked[1] ?? "";
        const media = isMp4(src)
          ? `<video controls src="${escapeHtml(src)}"></video>`
          : `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`;
        html += `<a href="${escapeHtml(href)}">${media}</a>`;
        index += linked[0].length;
        continue;
      }
    }
    if (source.startsWith("![", index)) {
      const labelEnd = source.indexOf("]", index + 2);
      if (labelEnd !== -1 && source[labelEnd + 1] === "(") {
        const urlEnd = source.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const url = safeUrl(source.slice(labelEnd + 2, urlEnd));
          if (url) {
            const alt = source.slice(index + 2, labelEnd);
            html += isMp4(url)
              ? `<video controls src="${escapeHtml(url)}"></video>`
              : `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`;
            index = urlEnd + 1;
            continue;
          }
        }
      }
    }
    if (source[index] === "[") {
      const labelEnd = source.indexOf("]", index + 1);
      if (labelEnd !== -1 && source[labelEnd + 1] === "(") {
        const urlEnd = source.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const url = safeUrl(source.slice(labelEnd + 2, urlEnd));
          if (url) {
            const label = source.slice(index + 1, labelEnd);
            const embed = mediaEmbedHtml(url, label);
            html += embed ?? `<a href="${escapeHtml(url)}">${renderInline(label)}</a>`;
            index = urlEnd + 1;
            continue;
          }
        }
      }
    }
    const bare = /^https?:\/\/[^\s<>)\]]+/.exec(source.slice(index));
    if (bare?.[0]) {
      const trimmed = bare[0].replace(/[.,;:]+$/, "");
      const embed = mediaEmbedHtml(trimmed, null);
      if (embed) {
        html += embed;
        index += trimmed.length;
        continue;
      }
    }
    html += escapeHtml(source[index] ?? "");
    index += 1;
  }
  return html;
}

type ListItem = { level: number; text: string };

function listItem(line: string): ListItem | null {
  const match = /^( *)([-*]) (.*)$/.exec(line);
  if (!match || match[2] === undefined || match[3] === undefined) return null;
  if (match[1] === undefined || match[1].length % 2 !== 0) return null;
  return { level: match[1].length / 2, text: match[3] };
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

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  if (line.startsWith("```")) return true;
  if (/^(#{1,6}) /.test(line)) return true;
  if (listItem(line)) return true;
  if (line.startsWith(">")) return true;
  if (isTableAt(lines, index)) return true;
  if (/^Table: \S/.test(line) && isTableAt(lines, index + 1)) return true;
  return false;
}

function renderList(lines: string[], cursor: { index: number }, level: number): string {
  const items: string[] = [];
  while (cursor.index < lines.length) {
    const parsed = listItem(lines[cursor.index] ?? "");
    if (!parsed || parsed.level < level) break;
    if (parsed.level > level) {
      const child = renderList(lines, cursor, parsed.level);
      if (items.length === 0) items.push(`<li>${child}</li>`);
      else items[items.length - 1] = `${items[items.length - 1]?.slice(0, -5) ?? ""}${child}</li>`;
      continue;
    }
    cursor.index += 1;
    let html = "";
    if (parsed.text.startsWith(">")) {
      const quotes = [renderInline(parsed.text.replace(/^>\s?/, ""))];
      while (cursor.index < lines.length) {
        const quoted = listItem(lines[cursor.index] ?? "");
        if (!quoted || quoted.level !== level || !quoted.text.startsWith(">")) break;
        quotes.push(renderInline(quoted.text.replace(/^>\s?/, "")));
        cursor.index += 1;
      }
      html = `<blockquote>${quotes.map((quote) => `<p>${quote}</p>`).join("")}</blockquote>`;
    } else {
      html = renderInline(parsed.text);
    }
    const next = listItem(lines[cursor.index] ?? "");
    if (next && next.level > level) html += renderList(lines, cursor, next.level);
    items.push(`<li>${html}</li>`);
  }
  return `<ul>${items.join("")}</ul>`;
}

function renderTable(lines: string[], cursor: { index: number }, caption: string, tableId: number): string {
  const header = splitCells(lines[cursor.index] ?? "");
  cursor.index += 2;
  const rows: string[][] = [];
  while (cursor.index < lines.length && (lines[cursor.index] ?? "").includes("|") && !isSeparator(lines[cursor.index] ?? "")) {
    const line = lines[cursor.index] ?? "";
    if (line.trim() === "" || isBlockStart(lines, cursor.index)) break;
    rows.push(splitCells(line));
    cursor.index += 1;
  }
  const captionId = `md-table-${tableId}`;
  const captionHtml = caption
    ? `<caption id="${captionId}">${escapeHtml(caption)}</caption>`
    : "";
  const label = caption ? ` aria-labelledby="${captionId}"` : ` aria-label="表"`;
  const head = `<thead><tr>${header.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="table-scroll" tabindex="0" role="region"${label}><table>${captionHtml}${head}${body}</table></div>`;
}

let tableSerial = 0;

export function markdownToHtml(source: string, gyazo?: GyazoIndex): string {
  const lines = (gyazo ? gyazoMarkdown(source, gyazo) : source)
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n");
  const blocks: string[] = [];
  const cursor = { index: 0 };
  while (cursor.index < lines.length) {
    const line = lines[cursor.index] ?? "";
    if (line.trim() === "") {
      cursor.index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const open = /^(```+)/.exec(line)?.[1]?.length ?? 3;
      const body: string[] = [];
      cursor.index += 1;
      while (cursor.index < lines.length) {
        const current = lines[cursor.index] ?? "";
        const size = /^(`+)/.exec(current)?.[1]?.length ?? 0;
        if (size >= open && current.trim() === "`".repeat(size)) break;
        body.push(current);
        cursor.index += 1;
      }
      if (cursor.index < lines.length) cursor.index += 1;
      blocks.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading?.[1] && heading[2]) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      cursor.index += 1;
      continue;
    }
    if (listItem(line)) {
      blocks.push(renderList(lines, cursor, listItem(line)?.level ?? 0));
      continue;
    }
    if (line.startsWith(">")) {
      const quotes: string[] = [];
      while (cursor.index < lines.length && (lines[cursor.index] ?? "").startsWith(">")) {
        quotes.push(renderInline((lines[cursor.index] ?? "").replace(/^>\s?/, "")));
        cursor.index += 1;
      }
      blocks.push(`<blockquote>${quotes.map((quote) => `<p>${quote}</p>`).join("")}</blockquote>`);
      continue;
    }
    const caption = /^Table: (\S(?:.*\S)?)\s*$/.exec(line)?.[1];
    if (caption && isTableAt(lines, cursor.index + 1)) {
      cursor.index += 1;
      tableSerial += 1;
      blocks.push(renderTable(lines, cursor, caption, tableSerial));
      continue;
    }
    if (isTableAt(lines, cursor.index)) {
      tableSerial += 1;
      blocks.push(renderTable(lines, cursor, "", tableSerial));
      continue;
    }
    const paragraph: string[] = [];
    while (
      cursor.index < lines.length &&
      (lines[cursor.index] ?? "").trim() !== "" &&
      !isBlockStart(lines, cursor.index)
    ) {
      paragraph.push(lines[cursor.index] ?? "");
      cursor.index += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return blocks.join("\n");
}
