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
import { isReservedTitle } from "../domain/catalog.ts";
import {
  bookmarkFromEditForm,
  bookmarkUpdateFromEditForm,
  type BookmarkCreateForm,
  type BookmarkEditForm,
} from "../domain/edit-bookmark.ts";
import { articlePathTitle } from "../domain/public-article.ts";
import { readStoredEntry, type StoredEntry } from "./entries.ts";

export type OwnerBookmark = {
  id: string;
  title: string;
  bookmarkUrl: string;
  visibility: string;
  updatedAt: string;
};

export type BookmarkEditResult =
  | { entry: StoredEntry }
  | {
      error: "not_found" | "missing_title" | "missing_bookmark_url" | "invalid_visibility";
    };

export async function listBookmarksForEdit(
  database: BetterSQLite3Database,
): Promise<OwnerBookmark[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "bookmark"))
    .orderBy(desc(entries.createdAt), desc(entries.id));
  return rows.flatMap((row) => {
    if (!row.bookmarkUrl) return [];
    return [
      {
        id: row.id,
        title: row.title,
        bookmarkUrl: row.bookmarkUrl,
        visibility: row.visibility,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

export async function submitBookmarkFromEdit(
  database: BetterSQLite3Database,
  form: BookmarkCreateForm,
): Promise<{ id: string } | { error: "missing_title" | "missing_bookmark_url" }> {
  const bookmark = bookmarkFromEditForm(form);
  if ("error" in bookmark) return bookmark;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database.insert(entries).values({
    id,
    kind: "bookmark",
    title: bookmark.title,
    body: bookmark.body,
    visibility: "draft",
    bookmarkUrl: bookmark.bookmarkUrl,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    viewPath: null,
  });
  return { id };
}

export async function updateBookmarkFromEdit(
  database: BetterSQLite3Database,
  id: string,
  form: BookmarkEditForm,
  now = new Date().toISOString(),
): Promise<BookmarkEditResult> {
  const found = await database.select().from(entries).where(eq(entries.id, id));
  const current = found[0];
  if (!current || current.kind !== "bookmark") return { error: "not_found" };
  const update = bookmarkUpdateFromEditForm(form);
  if ("error" in update) return update;
  const publishedAt =
    update.visibility === "public"
      ? current.visibility === "public" && current.publishedAt
        ? current.publishedAt
        : now
      : null;
  const viewPath = await bookmarkViewPath(database, id, update.title, update.visibility);
  await database
    .update(entries)
    .set({
      title: update.title,
      body: update.body,
      visibility: update.visibility,
      bookmarkUrl: update.bookmarkUrl,
      publishedAt,
      viewPath,
      updatedAt: now,
    })
    .where(and(eq(entries.id, id), eq(entries.kind, "bookmark")));
  const saved = await readStoredEntry(database, id);
  if (!saved) return { error: "not_found" };
  return { entry: saved };
}

export async function deleteBookmarkFromEdit(
  database: BetterSQLite3Database,
  id: string,
  deletedAt = new Date().toISOString(),
): Promise<{ ok: true } | { error: "not_found" }> {
  const current = await readStoredEntry(database, id);
  if (!current || current.kind !== "bookmark") return { error: "not_found" };
  const delivered = await database
    .select()
    .from(deliveryRecords)
    .where(eq(deliveryRecords.entryId, id));
  await database.delete(edges).where(eq(edges.sourceId, id));
  await database.delete(pastTitles).where(eq(pastTitles.entryId, id));
  await database.delete(pathRedirects).where(eq(pathRedirects.entryId, id));
  await database.delete(entries).where(and(eq(entries.id, id), eq(entries.kind, "bookmark")));
  if (delivered.length > 0) {
    await database.insert(tombstones).values({ entryId: id, deletedAt });
  }
  return { ok: true };
}

async function bookmarkViewPath(
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
