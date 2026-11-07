import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { eq } from "void/db";
import { entries } from "../db/schema.ts";

export type EntryCommit = {
  id: string;
  kind: string;
  title: string;
  body: string;
  visibility: string;
  bookmarkUrl?: string | null;
  publishedAt?: string | null;
  cosensePageId?: string | null;
  createdAt: string;
  updatedAt: string;
  viewPath?: string | null;
  lastImportedBody?: string | null;
  sourceUpdatedAt?: number | null;
};

export type StoredEntry = {
  id: string;
  kind: string;
  title: string;
  body: string;
  visibility: string;
  publishedAt: string | null;
};

// Reads one entries row. commitEntry uses this after it writes.
export async function readStoredEntry(
  database: BetterSQLite3Database,
  id: string,
): Promise<StoredEntry | null> {
  const found = await database.select().from(entries).where(eq(entries.id, id));
  const saved = found[0];
  if (!saved) return null;
  return {
    id: saved.id,
    kind: saved.kind,
    title: saved.title,
    body: saved.body,
    visibility: saved.visibility,
    publishedAt: saved.publishedAt,
  };
}

// Writes one entries row through the store adapter and reads it back.
// Callers pass a database. This module does not touch the void/db proxy.
export async function commitEntry(
  database: BetterSQLite3Database,
  row: EntryCommit,
): Promise<StoredEntry> {
  await database.insert(entries).values({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    visibility: row.visibility,
    bookmarkUrl: row.bookmarkUrl ?? null,
    publishedAt: row.publishedAt ?? null,
    cosensePageId: row.cosensePageId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    viewPath: row.viewPath ?? null,
    lastImportedBody: row.lastImportedBody ?? null,
    sourceUpdatedAt: row.sourceUpdatedAt ?? null,
  });
  const saved = await readStoredEntry(database, row.id);
  if (!saved) throw new Error("entry was not stored");
  return saved;
}
