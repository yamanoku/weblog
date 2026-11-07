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

function renderInline(source: string): string {
  let html = "";
  let index = 0;
  while (index < source.length) {
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
    if (source[index] === "[") {
      const labelEnd = source.indexOf("]", index + 1);
      if (labelEnd !== -1 && source[labelEnd + 1] === "(") {
        const urlEnd = source.indexOf(")", labelEnd + 2);
        if (urlEnd !== -1) {
          const url = safeUrl(source.slice(labelEnd + 2, urlEnd));
          if (url) {
            html += `<a href="${escapeHtml(url)}">${renderInline(source.slice(index + 1, labelEnd))}</a>`;
            index = urlEnd + 1;
            continue;
          }
        }
      }
    }
    html += escapeHtml(source[index] ?? "");
    index += 1;
  }
  return html;
}

function isBlockStart(line: string): boolean {
  return line.startsWith("```") || /^(#{1,6}) /.test(line) || /^[-*] /.test(line);
}

export function markdownToHtml(source: string): string {
  const lines = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }
    const heading = /^(#{1,6}) (.+)$/.exec(line);
    if (heading?.[1] && heading[2]) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*] /.test(lines[index] ?? "")) {
        items.push(`<li>${renderInline((lines[index] ?? "").slice(2))}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && (lines[index] ?? "").trim() !== "" && !isBlockStart(lines[index] ?? "")) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }
  return blocks.join("\n");
}
