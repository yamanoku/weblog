import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { db } from "void/db";
import { articleFromEditForm, type EditArticleForm } from "../domain/edit-article.ts";
import { commitEntry, type StoredEntry } from "./entries.ts";

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
