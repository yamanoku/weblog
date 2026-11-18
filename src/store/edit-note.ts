import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq, inArray, or } from "void/db";
import {
  deliveryRecords,
  edges,
  entries,
  noteImages,
  pastTitles,
  pathRedirects,
  tombstones,
} from "../db/schema.ts";
import {
  noteFromEditField,
  noteFromHomeField,
  orderedNoteThread,
  type NoteThreadView,
} from "../domain/edit-note.ts";
import { noteImageAltLimit, noteImagePath, type NoteImageBytes } from "../domain/note-image.ts";
import { commitEntry, readStoredEntry } from "./entries.ts";

export type NoteImageObjects = {
  put(id: string, image: NoteImageBytes): Promise<void>;
  delete(id: string): Promise<void>;
};

export type OwnerNote = {
  id: string;
  body: string;
  visibility: string;
  updatedAt: string;
  imageHref: string | null;
  imageAlt: string | null;
};

export type StoredNoteImage = {
  href: string;
  alt: string;
};

export async function noteImageViews(
  database: BetterSQLite3Database,
  ids: string[],
): Promise<Map<string, StoredNoteImage>> {
  if (ids.length === 0) return new Map();
  const rows = await database
    .select({ entryId: noteImages.entryId, altText: noteImages.altText })
    .from(noteImages)
    .where(inArray(noteImages.entryId, ids));
  return new Map(
    rows.map((row) => [row.entryId, { href: noteImagePath(row.entryId), alt: row.altText }]),
  );
}

// Lists stored notes for the owner edit screen. Drafts and public notes both appear.
export async function listNotesForEdit(database: BetterSQLite3Database): Promise<OwnerNote[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "note"))
    .orderBy(desc(entries.createdAt), desc(entries.id));
  const images = await noteImageViews(
    database,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    visibility: row.visibility,
    updatedAt: row.updatedAt,
    imageHref: images.get(row.id)?.href ?? null,
    imageAlt: images.get(row.id)?.alt ?? null,
  }));
}

// Removes one note. An article id and a missing id delete nothing.
export async function deleteNoteFromEdit(
  database: BetterSQLite3Database,
  id: string,
  deletedAt = new Date().toISOString(),
  objects: NoteImageObjects | null = null,
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
  await database.delete(noteImages).where(eq(noteImages.entryId, id));
  await database.delete(entries).where(and(eq(entries.id, id), eq(entries.kind, "note")));
  if (objects) await objects.delete(id);
  if (delivered.length > 0) {
    await database.insert(tombstones).values({ entryId: id, deletedAt });
  }
  return { ok: true };
}

export type ReplyResult =
  | { id: string }
  | { error: "empty_body"; id: string }
  | { error: "not_found" };

function isPublicNote<T extends { kind: string; visibility: string }>(entry: T | null): entry is T {
  return entry !== null && entry.kind === "note" && entry.visibility === "public";
}

// Public notes that share a thread, oldest first. A missing target stays in the list.
export type PublicNoteCard = NoteThreadView & {
  imageHref: string | null;
  imageAlt: string | null;
};

export async function listPublicNoteThread(
  database: BetterSQLite3Database,
  id: string,
): Promise<PublicNoteCard[]> {
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
  const views = orderedNoteThread(
    rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      inReplyToId: row.inReplyToId ?? null,
    })),
  );
  const images = await noteImageViews(
    database,
    views.map((note) => note.id),
  );
  return views.map((note) => ({
    ...note,
    imageHref: images.get(note.id)?.href ?? null,
    imageAlt: images.get(note.id)?.alt ?? null,
  }));
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
  image: NoteImageBytes | null = null,
  objects: NoteImageObjects | null = null,
  alt: string | null = null,
): Promise<
  { id: string } | { error: "empty_body" | "image_alt" | "image_alt_length" | "image_store" }
> {
  const note = noteFromHomeField(body, image !== null);
  if ("error" in note) return note;
  const imageAlt = image ? (alt ?? "").trim() : null;
  if (image && imageAlt === "") return { error: "image_alt" };
  if (image && imageAlt !== null && [...imageAlt].length > noteImageAltLimit) {
    return { error: "image_alt_length" };
  }
  if (image && !objects) return { error: "image_store" };
  const id = crypto.randomUUID();
  if (image && objects) {
    try {
      await objects.put(id, image);
    } catch {
      return { error: "image_store" };
    }
  }
  const now = new Date().toISOString();
  try {
    await commitEntry(database, {
      id,
      kind: "note",
      title: "",
      body: note.body,
      visibility: "public",
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    if (image) {
      await database.insert(noteImages).values({
        entryId: id,
        mediaType: image.mediaType,
        byteLength: image.bytes.byteLength,
        altText: imageAlt ?? "",
      });
    }
  } catch {
    if (image && objects) await objects.delete(id).catch(() => undefined);
    return { error: "image_store" };
  }
  return { id };
}

export async function readNoteImage(
  database: BetterSQLite3Database,
  id: string,
): Promise<{ mediaType: string } | null> {
  const found = await database.select().from(noteImages).where(eq(noteImages.entryId, id));
  const row = found[0];
  if (!row) return null;
  return { mediaType: row.mediaType };
}
