import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq, or } from "void/db";
import {
  deliveryRecords,
  edges,
  entries,
  pastTitles,
  pathRedirects,
  tombstones,
} from "../db/schema.ts";
import { noteFromEditField, orderedNoteThread, type NoteThreadView } from "../domain/edit-note.ts";
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
    .orderBy(desc(entries.createdAt), desc(entries.id));
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

export type ReplyResult =
  | { id: string }
  | { error: "empty_body"; id: string }
  | { error: "not_found" };

function isPublicNote<T extends { kind: string; visibility: string }>(
  entry: T | null,
): entry is T {
  return entry !== null && entry.kind === "note" && entry.visibility === "public";
}

// Public notes that share a thread, oldest first. A missing target stays in the list.
export async function listPublicNoteThread(
  database: BetterSQLite3Database,
  id: string,
): Promise<NoteThreadView[]> {
  const current = await readStoredEntry(database, id);
  if (!isPublicNote(current) || !current) return [];
  const rootId = current.threadRootId ?? current.id;
  const rows = await database
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.kind, "note"),
        eq(entries.visibility, "public"),
        or(eq(entries.id, rootId), eq(entries.threadRootId, rootId)),
      ),
    );
  return orderedNoteThread(
    rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      inReplyToId: row.inReplyToId ?? null,
    })),
  );
}

export async function submitReplyFromEdit(
  database: BetterSQLite3Database,
  body: string,
  replyTo: string,
): Promise<ReplyResult> {
  const note = noteFromEditField(body);
  const target = replyTo === "" ? null : await readStoredEntry(database, replyTo);
  if (!isPublicNote(target) || !target) return { error: "not_found" };
  if ("error" in note) return { error: "empty_body", id: target.id };
  const now = new Date().toISOString();
  const saved = await commitEntry(database, {
    id: crypto.randomUUID(),
    kind: "note",
    title: "",
    body: note.body,
    visibility: "public",
    createdAt: now,
    updatedAt: now,
    inReplyToId: target.id,
    threadRootId: target.threadRootId ?? target.id,
  });
  return { id: saved.id };
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
