import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, desc, eq, isNotNull, ne, or } from "void/db";
import { entries, tombstones } from "../db/schema.ts";

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

// A deleted delivered id remains as a tombstone. The row has no body.
export async function hasTombstone(
  database: BetterSQLite3Database,
  id: string,
): Promise<boolean> {
  const found = await database.select().from(tombstones).where(eq(tombstones.entryId, id));
  return found.length > 0;
}

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

export type PublicEntryRow = {
  id: string;
  title: string;
  kind: string;
  body: string;
};

const deliverableKind = or(
  eq(entries.kind, "article"),
  eq(entries.kind, "note"),
  eq(entries.kind, "bookmark"),
);

// Public articles, notes, and bookmarks that have a published time. Pages and drafts stay out.
export async function listDeliverableEntries(
  database: BetterSQLite3Database,
): Promise<PublicEntryRow[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(and(eq(entries.visibility, "public"), isNotNull(entries.publishedAt), deliverableKind))
    .orderBy(desc(entries.publishedAt), desc(entries.id));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
    body: row.body,
  }));
}

export type PublicTitleRow = {
  id: string;
  title: string;
};

// Public titles for the index. An empty title is omitted. Drafts stay out.
export async function listPublicTitles(
  database: BetterSQLite3Database,
): Promise<PublicTitleRow[]> {
  const rows = await database
    .select({ id: entries.id, title: entries.title })
    .from(entries)
    .where(and(eq(entries.visibility, "public"), ne(entries.title, "")))
    .orderBy(desc(entries.updatedAt), desc(entries.id));
  return rows;
}

// One public row for a title path. A view path wins over a raw title.
export async function readPublicEntryByPath(
  database: BetterSQLite3Database,
  pathTitle: string,
): Promise<PublicEntryRow | null> {
  const rows = await database
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.visibility, "public"),
        or(eq(entries.viewPath, pathTitle), eq(entries.title, pathTitle)),
      ),
    );
  const saved = rows.find((row) => row.viewPath === pathTitle) ?? rows[0];
  if (!saved) return null;
  return {
    id: saved.id,
    title: saved.title,
    kind: saved.kind,
    body: saved.body,
  };
}
