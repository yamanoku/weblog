import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, db, desc, eq, isNotNull } from "void/db";
import { entries } from "../db/schema.ts";
import {
  articleFromEditForm,
  articleUpdateFromEditForm,
  type ArticleEditForm,
  type EditArticleForm,
} from "../domain/edit-article.ts";
import { articlePathTitle } from "../domain/public-article.ts";
import { isReservedTitle } from "../domain/catalog.ts";
import { commitEntry, readStoredEntry, type StoredEntry } from "./entries.ts";

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

export type ArticleEditResult =
  | { entry: StoredEntry }
  | { error: "not_found" | "invalid_visibility" | "empty_body" };

// commitEntry speaks drizzle's sqlite API. Requests use D1; tests pass better-sqlite3.
export function editArticleDatabase(): BetterSQLite3Database {
  return db as unknown as BetterSQLite3Database;
}

// Saves the create form as one article. The body is the submitted markdown.
export async function submitArticleFromEdit(
  database: BetterSQLite3Database,
  form: EditArticleForm,
): Promise<StoredEntry> {
  const article = articleFromEditForm(form);
  const now = new Date().toISOString();
  return commitEntry(database, {
    id: crypto.randomUUID(),
    kind: article.kind,
    title: article.title,
    body: article.body,
    visibility: "draft",
    createdAt: now,
    updatedAt: now,
  });
}

// Lists stored articles for the owner edit screen. Drafts and public articles both appear.
export async function listArticlesForEdit(
  database: BetterSQLite3Database,
): Promise<OwnerArticle[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(eq(entries.kind, "article"))
    .orderBy(desc(entries.updatedAt), desc(entries.id));
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
): Promise<ArticleEditResult> {
  const found = await database.select().from(entries).where(eq(entries.id, id));
  const current = found[0];
  if (!current || current.kind !== "article") return { error: "not_found" };
  const update = articleUpdateFromEditForm(form);
  if ("error" in update) return update;
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
    .where(and(eq(entries.id, id), eq(entries.kind, "article")));
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
    .orderBy(desc(entries.publishedAt), desc(entries.id));
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
