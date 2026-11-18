import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { asc, eq, inArray } from "void/db";
import { noteImages } from "../db/schema.ts";
import { noteImagePath, type NoteImageBytes } from "../domain/note-image.ts";

export type EntryImageObjects = {
  put(id: string, image: NoteImageBytes): Promise<void>;
  delete(id: string): Promise<void>;
};

export type EntryImageView = {
  href: string;
  alt: string;
};

type EntryImageWrite = {
  id: string;
  alt: string;
  image: NoteImageBytes | null;
};

export async function entryImageViews(
  database: BetterSQLite3Database,
  ids: string[],
): Promise<Map<string, EntryImageView[]>> {
  const views = new Map<string, EntryImageView[]>();
  if (ids.length === 0) return views;
  const rows = await database
    .select({
      id: noteImages.id,
      entryId: noteImages.entryId,
      altText: noteImages.altText,
    })
    .from(noteImages)
    .where(inArray(noteImages.entryId, ids))
    .orderBy(asc(noteImages.position), asc(noteImages.id));
  for (const row of rows) {
    const list = views.get(row.entryId) ?? [];
    list.push({ href: noteImagePath(row.id), alt: row.altText });
    views.set(row.entryId, list);
  }
  return views;
}

export async function entryImagesForEdit(
  database: BetterSQLite3Database,
  entryId: string,
): Promise<{ id: string; alt: string }[]> {
  const rows = await database
    .select({ id: noteImages.id, altText: noteImages.altText })
    .from(noteImages)
    .where(eq(noteImages.entryId, entryId))
    .orderBy(asc(noteImages.position), asc(noteImages.id));
  return rows.map((row) => ({ id: row.id, alt: row.altText }));
}

export async function deleteEntryImages(
  database: BetterSQLite3Database,
  entryId: string,
  objects: EntryImageObjects | null = null,
): Promise<void> {
  const rows = await database
    .select({ id: noteImages.id })
    .from(noteImages)
    .where(eq(noteImages.entryId, entryId));
  await database.delete(noteImages).where(eq(noteImages.entryId, entryId));
  if (!objects) return;
  for (const row of rows) await objects.delete(row.id);
}

// Replaces the entry's images in the given order. A new id needs bytes. An existing id keeps its bytes.
export async function replaceEntryImages(
  database: BetterSQLite3Database,
  entryId: string,
  images: EntryImageWrite[],
  objects: EntryImageObjects,
): Promise<{ ok: true } | { error: "image_type" | "image_store" }> {
  const current = await database
    .select()
    .from(noteImages)
    .where(eq(noteImages.entryId, entryId));
  const owned = new Map(current.map((row) => [row.id, row]));
  for (const image of images) {
    if (!owned.has(image.id)) {
      const taken = await database.select().from(noteImages).where(eq(noteImages.id, image.id));
      if (taken.length > 0 || !image.image) return { error: "image_type" };
    }
  }
  const fresh = images.filter((image) => image.image && !owned.has(image.id));
  try {
    for (const image of images) {
      if (image.image) await objects.put(image.id, image.image);
    }
  } catch {
    for (const image of fresh) await objects.delete(image.id).catch(() => undefined);
    return { error: "image_store" };
  }
  const keep = new Set(images.map((image) => image.id));
  const removed = current.filter((row) => !keep.has(row.id));
  try {
    for (const [position, image] of images.entries()) {
      const previous = owned.get(image.id);
      const values = {
        id: image.id,
        entryId,
        position,
        mediaType: image.image?.mediaType ?? previous?.mediaType ?? "",
        byteLength: image.image?.bytes.byteLength ?? previous?.byteLength ?? 0,
        altText: image.alt,
      };
      if (previous) {
        await database.update(noteImages).set(values).where(eq(noteImages.id, image.id));
      } else {
        await database.insert(noteImages).values(values);
      }
    }
    for (const row of removed) {
      await database.delete(noteImages).where(eq(noteImages.id, row.id));
    }
  } catch {
    for (const image of fresh) await objects.delete(image.id).catch(() => undefined);
    return { error: "image_store" };
  }
  for (const row of removed) await objects.delete(row.id).catch(() => undefined);
  return { ok: true };
}
