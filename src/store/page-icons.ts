import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, inArray } from "void/db";
import { entries } from "../db/schema.ts";
import { firstGyazoIcon, iconTitles, pageIconSrc, type PageIcon } from "../domain/page-icon.ts";
import { gyazoExtensions } from "./gyazo-objects.ts";

const titleChunk = 80;

type IconRow = { id: string; title: string; body: string; viewPath: string | null };

function iconHref(row: IconRow): string {
  if (row.viewPath && row.viewPath.length > 0) return `/${encodeURIComponent(row.viewPath)}`;
  return `/e/${encodeURIComponent(row.id)}`;
}

// Public `[Title.icon]` targets. A reader does not write. A draft body is not read.
export async function pageIconsForBody(
  database: BetterSQLite3Database,
  body: string,
): Promise<Record<string, PageIcon>> {
  const titles = iconTitles(body);
  if (titles.length === 0) return {};
  const counts = new Map<string, number>();
  const rows = new Map<string, IconRow>();
  for (let start = 0; start < titles.length; start += titleChunk) {
    const chunk = titles.slice(start, start + titleChunk);
    const found = await database
      .select({
        id: entries.id,
        title: entries.title,
        body: entries.body,
        viewPath: entries.viewPath,
      })
      .from(entries)
      .where(and(eq(entries.visibility, "public"), inArray(entries.title, chunk)));
    for (const row of found) {
      counts.set(row.title, (counts.get(row.title) ?? 0) + 1);
      rows.set(row.title, row);
    }
  }
  const pending: { title: string; row: IconRow; imageId: string; extension: string | null }[] = [];
  for (const title of titles) {
    if (counts.get(title) !== 1) continue;
    const row = rows.get(title);
    if (!row) continue;
    const image = firstGyazoIcon(row.body);
    if (!image) continue;
    pending.push({ title, row, imageId: image.imageId, extension: image.extension });
  }
  const extensions = await gyazoExtensions(
    database,
    pending.map((item) => item.imageId),
  );
  const icons: Record<string, PageIcon> = {};
  for (const item of pending) {
    const src = pageIconSrc(
      { imageId: item.imageId, extension: item.extension },
      extensions[item.imageId] ?? [],
    );
    if (!src) continue;
    icons[item.title] = { href: iconHref(item.row), src };
  }
  return icons;
}
