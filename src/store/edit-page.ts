import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq } from "void/db";
import { isReservedTitle } from "../domain/catalog.ts";
import { pageUpdateFromEditForm, type PageEditForm } from "../domain/edit-page.ts";
import type { EntryImageDraft } from "../domain/entry-image.ts";
import { articlePathTitle } from "../domain/public-article.ts";
import { entries } from "../db/schema.ts";
import { replaceEntryImages, type EntryImageObjects } from "./entry-images.ts";
import { readStoredEntry, type StoredEntry } from "./entries.ts";

export type PageImageError = "image_type" | "image_alt_length" | "image_store";

export type PageEditResult =
  | { entry: StoredEntry }
  | { error: "not_found" | "missing_title" | "empty_body" | PageImageError };

const failingObjects: EntryImageObjects = {
  async put() {
    throw new Error("image store is missing");
  },
  async delete() {},
};

// Replaces one page's title and body. Kind, visibility, and import columns stay.
export async function updatePageFromEdit(
  database: BetterSQLite3Database,
  id: string,
  form: PageEditForm,
  now = new Date().toISOString(),
  images: EntryImageDraft[] | null = null,
  objects: EntryImageObjects | null = null,
): Promise<PageEditResult> {
  const found = await database.select().from(entries).where(eq(entries.id, id));
  const current = found[0];
  if (!current || current.kind !== "page") return { error: "not_found" };
  const update = pageUpdateFromEditForm(form);
  if ("error" in update) return update;
  if (images) {
    const written = await replaceEntryImages(database, id, images, objects ?? failingObjects);
    if ("error" in written) return written;
  }
  const viewPath = await pageViewPath(database, id, update.title, current.visibility);
  await database
    .update(entries)
    .set({
      title: update.title,
      body: update.body,
      viewPath,
      updatedAt: now,
    })
    .where(and(eq(entries.id, id), eq(entries.kind, "page")));
  const saved = await readStoredEntry(database, id);
  if (!saved) return { error: "not_found" };
  return { entry: saved };
}

async function pageViewPath(
  database: BetterSQLite3Database,
  id: string,
  title: string,
  visibility: string,
): Promise<string | null> {
  if (visibility !== "public") return null;
  const path = articlePathTitle(title);
  if (path.length === 0 || isReservedTitle(path)) return null;
  const taken = await database.select().from(entries).where(eq(entries.viewPath, path));
  if (taken.some((row) => row.id !== id)) return null;
  return path;
}
