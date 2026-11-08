// The note field on /edit posts a body and no title. An empty string is refused.
// Whitespace is kept. The canonical host does not follow the request Host header.

export function noteFromEditField(body: string): { body: string } | { error: "empty_body" } {
  if (body === "") return { error: "empty_body" };
  return { body };
}

// The posted object is either JSON from the note form or a form body. A missing field is empty.
export function noteBodyField(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const body = (value as { noteBody?: unknown }).noteBody;
  return typeof body === "string" ? body : "";
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
