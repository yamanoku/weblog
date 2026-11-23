// The home card shows this many characters of the body. The stored body stays whole.

import { markdownToHtml } from "./markdown-html.ts";

export const cardBodyLimit = 100;

function collapse(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").replace(/\s+/g, " ").trim();
}

function decodeText(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");
}

// Article and bookmark cards count the words a reader would see, not the Markdown marks.
function markdownText(source: string): string {
  const html = markdownToHtml(source)
    .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*>/g, "$1")
    .replace(/<\/(?:h[1-6]|p|li|ul|pre)>/g, " ")
    .replace(/<[^>]+>/g, "");
  return collapse(decodeText(html));
}

export function cardBodyExcerpt(body: string, kind: string): string {
  const text = kind === "note" ? collapse(body) : markdownText(body);
  const chars = [...text];
  if (chars.length <= cardBodyLimit) return text;
  return `${chars.slice(0, cardBodyLimit).join("")}…`;
}
