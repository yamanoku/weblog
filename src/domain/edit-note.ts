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

export function replyToField(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const id = (value as { replyTo?: unknown }).replyTo;
  return typeof id === "string" ? id : "";
}

export type NoteThreadItem = {
  id: string;
  body: string;
  createdAt: string;
  inReplyToId: string | null;
};

export type NoteThreadView = {
  id: string;
  body: string;
  replyToId: string | null;
};

// Oldest first. A reply target is shown only when that note is still in the thread.
export function orderedNoteThread(notes: NoteThreadItem[]): NoteThreadView[] {
  const sorted = [...notes].sort((left, right) => {
    if (left.createdAt < right.createdAt) return -1;
    if (left.createdAt > right.createdAt) return 1;
    if (left.id < right.id) return -1;
    if (left.id > right.id) return 1;
    return 0;
  });
  const ids = new Set(sorted.map((note) => note.id));
  return sorted.map((note) => ({
    id: note.id,
    body: note.body,
    replyToId: note.inReplyToId !== null && ids.has(note.inReplyToId) ? note.inReplyToId : null,
  }));
}

export function noteDeleteId(value: unknown): { id: string } | { error: "not_found" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "not_found" };
  const id = (value as { noteId?: unknown }).noteId;
  if (typeof id !== "string" || id === "") return { error: "not_found" };
  return { id };
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
