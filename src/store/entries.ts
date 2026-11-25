import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, count, desc, eq, isNotNull, isNull, or, sql } from "void/db";
import { entries, tombstones } from "../db/schema.ts";
import { homePageCount } from "../domain/home-page.ts";

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
  inReplyToId?: string | null;
  threadRootId?: string | null;
};

export type StoredEntry = {
  id: string;
  kind: string;
  title: string;
  body: string;
  visibility: string;
  bookmarkUrl: string | null;
  publishedAt: string | null;
  inReplyToId: string | null;
  threadRootId: string | null;
  viewPath: string | null;
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
    bookmarkUrl: saved.bookmarkUrl ?? null,
    publishedAt: saved.publishedAt,
    inReplyToId: saved.inReplyToId ?? null,
    threadRootId: saved.threadRootId ?? null,
    viewPath: saved.viewPath ?? null,
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
    inReplyToId: row.inReplyToId ?? null,
    threadRootId: row.threadRootId ?? null,
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
  bookmarkUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

const deliverableKind = or(
  eq(entries.kind, "article"),
  eq(entries.kind, "note"),
  eq(entries.kind, "bookmark"),
);

const deliverableWhere = and(
  eq(entries.visibility, "public"),
  isNotNull(entries.publishedAt),
  isNull(entries.inReplyToId),
  deliverableKind,
);

// The home list adds public pages. A page with a source time uses that time.
// Other rows keep updated_at. Feeds stay on deliverableWhere.
const homeWhere = or(deliverableWhere, and(eq(entries.visibility, "public"), eq(entries.kind, "page")));
const homeMoment = sql`CASE WHEN ${entries.kind} = 'page' AND ${entries.sourceUpdatedAt} IS NOT NULL THEN ${entries.sourceUpdatedAt} ELSE CAST(strftime('%s', ${entries.updatedAt}) AS INTEGER) END`;

function publicEntryRow(row: {
  id: string;
  title: string;
  kind: string;
  body: string;
  bookmarkUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
}): PublicEntryRow {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    body: row.body,
    bookmarkUrl: row.bookmarkUrl ?? null,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
  };
}

// Public articles, notes, and bookmarks that have a published time. Pages and drafts stay out.
export async function listDeliverableEntries(
  database: BetterSQLite3Database,
): Promise<PublicEntryRow[]> {
  const rows = await database
    .select()
    .from(entries)
    .where(deliverableWhere)
    .orderBy(desc(entries.updatedAt), desc(entries.id));
  return rows.map(publicEntryRow);
}

// One home page. The caller turns a page past the end into 404.
export async function listDeliverableEntryPage(
  database: BetterSQLite3Database,
  page: number,
  size: number,
): Promise<{ rows: PublicEntryRow[]; total: number }> {
  const counted = await database.select({ total: count() }).from(entries).where(deliverableWhere);
  const total = Number(counted[0]?.total ?? 0);
  if (page > homePageCount(total, size)) return { rows: [], total };
  const rows = await database
    .select()
    .from(entries)
    .where(deliverableWhere)
    .orderBy(desc(entries.updatedAt), desc(entries.id))
    .limit(size)
    .offset((page - 1) * size);
  return { total, rows: rows.map(publicEntryRow) };
}

// Home HTML. Deliverable entries plus public pages. Feeds do not use this list.
export async function listHomeEntryPage(
  database: BetterSQLite3Database,
  page: number,
  size: number,
): Promise<{ rows: PublicEntryRow[]; total: number }> {
  const counted = await database.select({ total: count() }).from(entries).where(homeWhere);
  const total = Number(counted[0]?.total ?? 0);
  if (page > homePageCount(total, size)) return { rows: [], total };
  const rows = await database
    .select()
    .from(entries)
    .where(homeWhere)
    .orderBy(desc(homeMoment), desc(entries.id))
    .limit(size)
    .offset((page - 1) * size);
  return { total, rows: rows.map(publicEntryRow) };
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
    bookmarkUrl: saved.bookmarkUrl ?? null,
    publishedAt: saved.publishedAt,
  };
}
