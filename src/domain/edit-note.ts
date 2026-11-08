// The note field on /edit posts a body and no title. An empty string is refused.
// Whitespace is kept. The canonical host does not follow the request Host header.

export function noteFromEditField(body: string): { body: string } | { error: "empty_body" } {
  if (body === "") return { error: "empty_body" };
  return { body };
}

export function canonicalEntryUrl(id: string): string {
  return `https://weblog.yamanoku.net/e/${id}`;
}

export function postedNoteUrl(
  entry: { id: string; kind: string; visibility: string } | null,
): { canonicalUrl: string } | null {
  if (!entry || entry.kind !== "note" || entry.visibility !== "public") return null;
  return { canonicalUrl: canonicalEntryUrl(entry.id) };
}
