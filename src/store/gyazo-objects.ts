import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, inArray } from "void/db";
import { gyazoObjects } from "../db/schema.ts";
import { gyazoImageIds } from "../domain/gyazo.ts";

const idChunk = 80;

export async function gyazoExtensions(
  database: BetterSQLite3Database,
  ids: string[],
): Promise<Record<string, string[]>> {
  const found = new Map<string, Set<string>>();
  for (let start = 0; start < ids.length; start += idChunk) {
    const chunk = ids.slice(start, start + idChunk);
    if (chunk.length === 0) continue;
    const rows = await database
      .select({ imageId: gyazoObjects.imageId, extension: gyazoObjects.extension })
      .from(gyazoObjects)
      .where(inArray(gyazoObjects.imageId, chunk));
    for (const row of rows) {
      const extensions = found.get(row.imageId) ?? new Set<string>();
      extensions.add(row.extension);
      found.set(row.imageId, extensions);
    }
  }
  return Object.fromEntries([...found].map(([id, extensions]) => [id, [...extensions]]));
}

export async function gyazoIndexForBody(
  database: BetterSQLite3Database,
  body: string,
): Promise<Record<string, string[]>> {
  return gyazoExtensions(database, gyazoImageIds(body));
}

export async function readGyazoObject(
  database: BetterSQLite3Database,
  imageId: string,
  extension: string,
): Promise<{ objectKey: string } | null> {
  const rows = await database
    .select({ objectKey: gyazoObjects.objectKey })
    .from(gyazoObjects)
    .where(and(eq(gyazoObjects.imageId, imageId), eq(gyazoObjects.extension, extension)));
  return rows[0] ?? null;
}
