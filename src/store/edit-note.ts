import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq } from "void/db";
import {
  deliveryRecords,
  edges,
  entries,
  pastTitles,
  pathRedirects,
  tombstones,
} from "../db/schema.ts";
import { noteFromEditField } from "../domain/edit-note.ts";
import { commitEntry, readStoredEntry } from "./entries.ts";

export type OwnerNote = {
  id: string;
  body: string;
  visibility: string;
  updatedAt: string;
};

// Lists stored notes for the owner edit screen. Drafts and public notes both appear.
export async function listNotesForEdit(database: BetterSQLite3Database): Promise<OwnerNote[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "note"))
    .orderBy(desc(entries.updatedAt), desc(entries.id));
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    visibility: row.visibility,
    updatedAt: row.updatedAt,
  }));
}

// Removes one note. An article id and a missing id delete nothing.
export async function deleteNoteFromEdit(
  database: BetterSQLite3Database,
  id: string,
  deletedAt = new Date().toISOString(),
): Promise<{ ok: true } | { error: "not_found" }> {
  const current = await readStoredEntry(database, id);
  if (!current || current.kind !== "note") return { error: "not_found" };
  const delivered = await database
    .select()
    .from(deliveryRecords)
    .where(eq(deliveryRecords.entryId, id));
  await database.delete(edges).where(eq(edges.sourceId, id));
  await database.delete(pastTitles).where(eq(pastTitles.entryId, id));
  await database.delete(pathRedirects).where(eq(pathRedirects.entryId, id));
  await database.delete(entries).where(and(eq(entries.id, id), eq(entries.kind, "note")));
  if (delivered.length > 0) {
    await database.insert(tombstones).values({ entryId: id, deletedAt });
  }
  return { ok: true };
}

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
