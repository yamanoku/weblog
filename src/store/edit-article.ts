import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, db, desc, eq, isNotNull, or } from "void/db";
import {
  articleFromEditForm,
  articleUpdateFromEditForm,
  diaryFromEditForm,
  type ArticleEditForm,
  type EditArticleForm,
} from "../domain/edit-article.ts";
import { articlePathTitle } from "../domain/public-article.ts";
import { isReservedTitle } from "../domain/catalog.ts";
import type { EntryImageDraft } from "../domain/entry-image.ts";
import { deleteEntryImages, replaceEntryImages, type EntryImageObjects } from "./entry-images.ts";
import { commitEntry, readStoredEntry, type StoredEntry } from "./entries.ts";
import { entries } from "../db/schema.ts";

export type OwnerArticle = {
  id: string;
  title: string;
  visibility: string;
  updatedAt: string;
};

export type PublicArticle = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
};

export type ArticleImageError = "image_type" | "image_alt_length" | "image_store";

export type ArticleEditResult =
  | { entry: StoredEntry }
  | { error: "not_found" | "invalid_visibility" | "empty_body" | ArticleImageError };

export type ArticleCreateResult = StoredEntry | { error: "invalid_visibility" | "empty_body" | ArticleImageError };

// commitEntry speaks drizzle's sqlite API. Requests use D1; tests pass better-sqlite3.
export function editArticleDatabase(): BetterSQLite3Database {
  return db as unknown as BetterSQLite3Database;
}

// Saves the create form as one article. The body is the submitted markdown.
export async function submitArticleFromEdit(
  database: BetterSQLite3Database,
  form: EditArticleForm,
  images: EntryImageDraft[] | null = null,
  objects: EntryImageObjects | null = null,
): Promise<ArticleCreateResult> {
  const article = articleFromEditForm(form);
  if ("error" in article) return article;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const saved = await commitEntry(database, {
    id,
    kind: article.kind,
    title: article.title,
    body: article.body,
    visibility: article.visibility,
    publishedAt: article.visibility === "public" ? now : null,
    viewPath: await articleViewPath(database, id, article.title, article.visibility),
    createdAt: now,
    updatedAt: now,
  });
  if (!images) return saved;
  const written = await replaceEntryImages(database, saved.id, images, objects ?? failingObjects);
  if ("error" in written) {
    await deleteEntryImages(database, saved.id, objects);
    await database.delete(entries).where(eq(entries.id, saved.id));
    return written;
  }
  return saved;
}

// Saves the diary form. Visibility follows the article form.
export async function submitDiaryFromEdit(
  database: BetterSQLite3Database,
  form: EditArticleForm,
  images: EntryImageDraft[] | null = null,
  objects: EntryImageObjects | null = null,
): Promise<ArticleCreateResult> {
  const diary = diaryFromEditForm(form);
  if ("error" in diary) return diary;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const saved = await commitEntry(database, {
    id,
    kind: diary.kind,
    title: diary.title,
    body: diary.body,
    visibility: diary.visibility,
    publishedAt: diary.visibility === "public" ? now : null,
    viewPath: await articleViewPath(database, id, diary.title, diary.visibility),
    createdAt: now,
    updatedAt: now,
  });
  if (!images) return saved;
  const written = await replaceEntryImages(database, saved.id, images, objects ?? failingObjects);
  if ("error" in written) {
    await deleteEntryImages(database, saved.id, objects);
    await database.delete(entries).where(eq(entries.id, saved.id));
    return written;
  }
  return saved;
}

const failingObjects: EntryImageObjects = {
  async put() {
    throw new Error("image store is missing");
  },
  async delete() {},
};

// Lists stored articles for the owner edit screen. Drafts and public articles both appear.
export async function listArticlesForEdit(
  database: BetterSQLite3Database,
): Promise<OwnerArticle[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "article"))
    .orderBy(desc(entries.createdAt), desc(entries.id));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    updatedAt: row.updatedAt,
  }));
}

// Lists stored diaries for the owner edit screen. Drafts and public diaries both appear.
export async function listDiariesForEdit(
  database: BetterSQLite3Database,
): Promise<OwnerArticle[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "diary"))
    .orderBy(desc(entries.createdAt), desc(entries.id));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    updatedAt: row.updatedAt,
  }));
}

// Replaces one article's title, body, and visibility. An empty public body is refused.
export async function updateArticleFromEdit(
  database: BetterSQLite3Database,
  id: string,
  form: ArticleEditForm,
  now = new Date().toISOString(),
  images: EntryImageDraft[] | null = null,
  objects: EntryImageObjects | null = null,
): Promise<ArticleEditResult> {
  const found = await database.select().from(entries).where(eq(entries.id, id));
  const current = found[0];
  if (!current || (current.kind !== "article" && current.kind !== "diary")) return { error: "not_found" };
  const update = articleUpdateFromEditForm(form);
  if ("error" in update) return update;
  if (images) {
    const written = await replaceEntryImages(database, id, images, objects ?? failingObjects);
    if ("error" in written) return written;
  }
  const publishedAt =
    update.visibility === "public"
      ? current.visibility === "public" && current.publishedAt
        ? current.publishedAt
        : now
      : null;
  const viewPath = await articleViewPath(database, id, update.title, update.visibility);
  await database
    .update(entries)
    .set({
      title: update.title,
      body: update.body,
      visibility: update.visibility,
      publishedAt,
      viewPath,
      updatedAt: now,
    })
    .where(and(eq(entries.id, id), or(eq(entries.kind, "article"), eq(entries.kind, "diary"))));
  const saved = await readStoredEntry(database, id);
  if (!saved) return { error: "not_found" };
  return { entry: saved };
}

// Public articles for the home list and the title page. Drafts stay out.
export async function listPublicArticles(
  database: BetterSQLite3Database,
): Promise<PublicArticle[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(
      and(eq(entries.kind, "article"), eq(entries.visibility, "public"), isNotNull(entries.publishedAt)),
    )
    .orderBy(desc(entries.updatedAt), desc(entries.id));
  return rows.flatMap((row) => {
    if (!row.publishedAt) return [];
    return [
      {
        id: row.id,
        title: row.title,
        body: row.body,
        publishedAt: row.publishedAt,
      },
    ];
  });
}

async function articleViewPath(
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
