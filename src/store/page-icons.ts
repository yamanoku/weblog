import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq, inArray } from "void/db";
import { entries } from "../db/schema.ts";
import {
  archivedPageIcons,
  firstGyazoIcon,
  iconTitles,
  pageIconSrc,
  type PageIcon,
} from "../domain/page-icon.ts";
import { articlePathTitle } from "../domain/public-article.ts";
import { gyazoExtensions } from "./gyazo-objects.ts";

const titleChunk = 80;

type IconRow = { id: string; title: string; body: string; viewPath: string | null };

function iconHref(row: IconRow): string {
  if (row.viewPath && row.viewPath.length > 0) return `/${encodeURIComponent(row.viewPath)}`;
  return `/e/${encodeURIComponent(row.id)}`;
}

function titleHref(title: string): string {
  return `/${encodeURIComponent(articlePathTitle(title))}`;
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
  const pending: {
    title: string;
    href: string;
    imageId: string;
    extension: string | null;
    shipped: boolean;
  }[] = [];
  for (const title of titles) {
    if (counts.get(title) !== 1) continue;
    const row = rows.get(title);
    if (!row) continue;
    const image = firstGyazoIcon(row.body);
    if (!image) continue;
    pending.push({
      title,
      href: iconHref(row),
      imageId: image.imageId,
      extension: image.extension,
      shipped: false,
    });
  }
  for (const title of titles) {
    if ((counts.get(title) ?? 0) !== 0) continue;
    const icon = archivedPageIcons[title];
    if (!icon) continue;
    pending.push({
      title,
      href: titleHref(title),
      imageId: icon.imageId,
      extension: icon.extension,
      shipped: true,
    });
  }
  const extensions = await gyazoExtensions(
    database,
    pending.filter((item) => !item.shipped).map((item) => item.imageId),
  );
  const icons: Record<string, PageIcon> = {};
  for (const item of pending) {
    const src = pageIconSrc(
      { imageId: item.imageId, extension: item.extension },
      item.shipped ? [item.extension ?? ""] : (extensions[item.imageId] ?? []),
    );
    if (!src) continue;
    icons[item.title] = { href: item.href, src };
  }
  return icons;
}
