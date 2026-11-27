import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, inArray, or, sql } from "void/db";
import { entries, pastTitles } from "../db/schema.ts";
import {
  normalizeLinkTitle,
  pageLinkTitles,
  relatedPageLinks,
  titlePathNeedles,
  type RelatedLink,
  type RelatedSource,
} from "../domain/related-pages.ts";

const titleChunk = 80;
const needleChunk = 20;

type TitleRow = {
  id: string;
  title: string;
  viewPath: string | null;
  updatedAt: string;
};

function toSource(row: TitleRow, body = ""): RelatedSource {
  return {
    id: row.id,
    title: row.title,
    body,
    viewPath: row.viewPath,
    updatedAt: row.updatedAt,
  };
}

async function publicByCurrentTitle(
  database: BetterSQLite3Database,
  titles: string[],
): Promise<Map<string, RelatedSource[]>> {
  const grouped = new Map<string, RelatedSource[]>();
  for (let start = 0; start < titles.length; start += titleChunk) {
    const chunk = titles.slice(start, start + titleChunk);
    const found = await database
      .select({
        id: entries.id,
        title: entries.title,
        viewPath: entries.viewPath,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .where(and(eq(entries.visibility, "public"), inArray(entries.title, chunk)));
    for (const row of found) {
      const list = grouped.get(row.title) ?? [];
      list.push(toSource(row));
      grouped.set(row.title, list);
    }
  }
  return grouped;
}

async function publicByPastTitle(
  database: BetterSQLite3Database,
  titles: string[],
): Promise<Map<string, RelatedSource | null>> {
  const resolved = new Map<string, RelatedSource | null>();
  if (titles.length === 0) return resolved;
  const hits: { entryId: string; title: string; recordedAt: string }[] = [];
  for (let start = 0; start < titles.length; start += titleChunk) {
    const chunk = titles.slice(start, start + titleChunk);
    const found = await database
      .select({
        entryId: pastTitles.entryId,
        title: pastTitles.title,
        recordedAt: pastTitles.recordedAt,
      })
      .from(pastTitles)
      .where(inArray(pastTitles.title, chunk));
    hits.push(...found);
  }
  const ids = [...new Set(hits.map((hit) => hit.entryId))];
  const publics = new Map<string, RelatedSource>();
  for (let start = 0; start < ids.length; start += titleChunk) {
    const chunk = ids.slice(start, start + titleChunk);
    const found = await database
      .select({
        id: entries.id,
        title: entries.title,
        viewPath: entries.viewPath,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .where(and(eq(entries.visibility, "public"), inArray(entries.id, chunk)));
    for (const row of found) publics.set(row.id, toSource(row));
  }
  const byTitle = new Map<string, { entryId: string; recordedAt: string }[]>();
  for (const hit of hits) {
    const list = byTitle.get(hit.title) ?? [];
    list.push({ entryId: hit.entryId, recordedAt: hit.recordedAt });
    byTitle.set(hit.title, list);
  }
  for (const [title, group] of byTitle) {
    const latest = group.reduce((max, hit) => (hit.recordedAt > max ? hit.recordedAt : max), "");
    const winners = [...new Set(group.filter((hit) => hit.recordedAt === latest).map((hit) => hit.entryId))];
    const publicWinners = winners.filter((id) => publics.has(id));
    resolved.set(title, publicWinners.length === 1 ? (publics.get(publicWinners[0] ?? "") ?? null) : null);
  }
  return resolved;
}

async function inboundCandidates(
  database: BetterSQLite3Database,
  subjectId: string,
  needles: string[],
): Promise<RelatedSource[]> {
  const rows: RelatedSource[] = [];
  for (let start = 0; start < needles.length; start += needleChunk) {
    const chunk = needles.slice(start, start + needleChunk);
    const checks = chunk.map((needle) => sql`instr(${entries.body}, ${needle}) > 0`);
    const matches = checks.length === 1 ? checks[0] : or(...checks);
    const found = await database
      .select({
        id: entries.id,
        title: entries.title,
        body: entries.body,
        viewPath: entries.viewPath,
        updatedAt: entries.updatedAt,
      })
      .from(entries)
      .where(and(eq(entries.visibility, "public"), sql`${entries.id} <> ${subjectId}`, matches));
    for (const row of found) {
      if (rows.some((saved) => saved.id === row.id)) continue;
      rows.push(toSource(row, row.body));
    }
  }
  return rows;
}

// Related pages for one entry. Draft targets stay out. This read does not write edges.
export async function listRelatedPages(
  database: BetterSQLite3Database,
  subject: { id: string; title: string; body: string },
): Promise<RelatedLink[]> {
  const outgoing = pageLinkTitles(subject.body);
  const past = await database
    .select({ title: pastTitles.title })
    .from(pastTitles)
    .where(eq(pastTitles.entryId, subject.id));
  const names = [
    ...new Set([subject.title, ...past.map((row) => row.title)].map((title) => normalizeLinkTitle(title))),
  ].filter((title) => title.length > 0);
  const inbound = await inboundCandidates(
    database,
    subject.id,
    [...new Set(names.flatMap((title) => titlePathNeedles(title)))],
  );
  const mentioned = [
    ...new Set([...outgoing, ...names, ...inbound.flatMap((row) => pageLinkTitles(row.body))]),
  ];
  const current = await publicByCurrentTitle(database, mentioned);
  const missing = mentioned.filter((title) => (current.get(title)?.length ?? 0) === 0);
  const previous = await publicByPastTitle(database, missing);
  const resolve = (title: string): RelatedSource | null => {
    const found = current.get(title) ?? [];
    if (found.length === 1) return found[0] ?? null;
    if (found.length > 1) return null;
    return previous.get(title) ?? null;
  };
  return relatedPageLinks(subject, resolve, inbound);
}
