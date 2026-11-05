import { eq } from "void/db";
import { entries } from "../db/schema.ts";

// Writes one entries row through the store adapter and reads it back.
// Callers pass a database. This module does not touch the void/db proxy.
export async function commitEntry(database, row) {
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
  const found = await database.select().from(entries).where(eq(entries.id, row.id));
  const saved = found[0];
  return {
    id: saved.id,
    kind: saved.kind,
    title: saved.title,
    body: saved.body,
    visibility: saved.visibility,
  };
}
