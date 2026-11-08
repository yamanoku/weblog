import { publicEntries } from "../domain/catalog.ts";
import { publicEntryHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { editArticleDatabase } from "../store/edit-article.ts";
import { listPublicTitles } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function titleEntry(entry: {
  id: string;
  title: string;
  kind?: string;
  bookmarkUrl?: string | null;
}) {
  return {
    id: entry.id,
    title: entry.title,
    href: publicEntryHref(entry),
  };
}

export const loader = defineHandler(async () => {
  if (readsDevCatalog()) {
    return { entries: publicEntries().map(titleEntry) };
  }
  const stored = await listPublicTitles(editArticleDatabase());
  return { entries: stored.map(titleEntry) };
});
