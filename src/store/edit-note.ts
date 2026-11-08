import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { noteFromEditField } from "../domain/edit-note.ts";
import { commitEntry } from "./entries.ts";

export async function submitNoteFromEdit(
  database: BetterSQLite3Database,
  body: string,
): Promise<{ id: string } | { error: "empty_body" }> {
  const note = noteFromEditField(body);
  if ("error" in note) return note;
  const now = new Date().toISOString();
  const saved = await commitEntry(database, {
    id: crypto.randomUUID(),
    kind: "note",
    title: "",
    body: note.body,
    visibility: "public",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return { id: saved.id };
}
