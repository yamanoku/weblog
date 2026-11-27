import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, asc, count, desc, eq, isNotNull, isNull, or, sql } from "void/db";
import { entries, pathRedirects, tombstones } from "../db/schema.ts";
import {
  monthDiaryHrefs,
  monthTitleBounds,
  sameDayLinks,
  tokyoDayBounds,
  type CalendarSource,
  type SameDayLink,
  type YearMonth,
} from "../domain/home-calendar.ts";

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
  createdAt: string;
  inReplyToId: string | null;
  threadRootId: string | null;
  viewPath: string | null;
};

// A deleted delivered id remains as a tombstone. The row has no body.
export async function hasTombstone(database: BetterSQLite3Database, id: string): Promise<boolean> {
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
    createdAt: saved.createdAt,
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
  createdAt: string;
  updatedAt: string;
};

const deliverableKind = or(
  eq(entries.kind, "article"),
  eq(entries.kind, "diary"),
  eq(entries.kind, "note"),
  eq(entries.kind, "bookmark"),
);

const deliverableWhere = and(
  eq(entries.visibility, "public"),
  isNotNull(entries.publishedAt),
  isNull(entries.inReplyToId),
  deliverableKind,
);

function pageCount(total: number, size: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / size);
}

function publicEntryRow(row: {
  id: string;
  title: string;
  kind: string;
  body: string;
  bookmarkUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): PublicEntryRow {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    body: row.body,
    bookmarkUrl: row.bookmarkUrl ?? null,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
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

// One page of the deliverable list. The home calendar does not use this offset.
export async function listDeliverableEntryPage(
  database: BetterSQLite3Database,
  page: number,
  size: number,
): Promise<{ rows: PublicEntryRow[]; total: number }> {
  const counted = await database.select({ total: count() }).from(entries).where(deliverableWhere);
  const total = Number(counted[0]?.total ?? 0);
  if (page > pageCount(total, size)) return { rows: [], total };
  const rows = await database
    .select()
    .from(entries)
    .where(deliverableWhere)
    .orderBy(desc(entries.updatedAt), desc(entries.id))
    .limit(size)
    .offset((page - 1) * size);
  return { total, rows: rows.map(publicEntryRow) };
}

// Public date-titled diaries that have a view path. The home table links these.
export async function listMonthDiaryHrefs(
  database: BetterSQLite3Database,
  month: YearMonth,
): Promise<Record<string, string>> {
  const bounds = monthTitleBounds(month);
  const rows = await database
    .select({ id: entries.id, title: entries.title, viewPath: entries.viewPath })
    .from(entries)
    .where(
      and(
        eq(entries.visibility, "public"),
        eq(entries.kind, "diary"),
        isNotNull(entries.viewPath),
        sql`${entries.title} >= ${bounds.start} AND ${entries.title} < ${bounds.end}`,
      ),
    )
    .orderBy(asc(entries.id));
  return monthDiaryHrefs(rows.map(calendarDiary), month);
}

// Public articles, notes, and bookmarks created on that Tokyo date.
export async function listSameDayLinks(
  database: BetterSQLite3Database,
  date: string,
): Promise<SameDayLink[]> {
  const bounds = tokyoDayBounds(date);
  const rows = await database
    .select({
      id: entries.id,
      title: entries.title,
      kind: entries.kind,
      createdAt: entries.createdAt,
      viewPath: entries.viewPath,
      inReplyToId: entries.inReplyToId,
    })
    .from(entries)
    .where(
      and(
        eq(entries.visibility, "public"),
        or(eq(entries.kind, "article"), eq(entries.kind, "note"), eq(entries.kind, "bookmark")),
        isNull(entries.inReplyToId),
        sql`${entries.createdAt} >= ${bounds.start} AND ${entries.createdAt} < ${bounds.end}`,
      ),
    )
    .orderBy(asc(entries.createdAt), asc(entries.id));
  return sameDayLinks(rows.map(calendarSameDay), date);
}

function calendarDiary(row: {
  id: string;
  title: string;
  viewPath: string | null;
}): CalendarSource {
  return {
    id: row.id,
    title: row.title,
    kind: "diary",
    visibility: "public",
    viewPath: row.viewPath,
    createdAt: null,
    inReplyToId: null,
  };
}

function calendarSameDay(row: {
  id: string;
  title: string;
  kind: string;
  createdAt: string;
  viewPath: string | null;
  inReplyToId: string | null;
}): CalendarSource {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    visibility: "public",
    viewPath: row.viewPath,
    createdAt: row.createdAt,
    inReplyToId: row.inReplyToId,
  };
}

// A former view path of a public entry. Drafts and missing rows do not redirect.
export async function readPublicPathRedirect(
  database: BetterSQLite3Database,
  pathKey: string,
): Promise<{ id: string; viewPath: string | null } | null> {
  const redirects = await database
    .select({ entryId: pathRedirects.entryId })
    .from(pathRedirects)
    .where(eq(pathRedirects.pathKey, pathKey));
  const entryId = redirects[0]?.entryId;
  if (!entryId) return null;
  const rows = await database
    .select({ id: entries.id, viewPath: entries.viewPath, visibility: entries.visibility })
    .from(entries)
    .where(eq(entries.id, entryId));
  const row = rows[0];
  if (!row || row.visibility !== "public") return null;
  return { id: row.id, viewPath: row.viewPath };
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
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  };
}
