import { publicEntries } from "../domain/catalog.ts";
import { publicArticleHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { editArticleDatabase } from "../store/edit-article.ts";
import { listPublicTitles } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function titleEntry(entry: { id: string; title: string }) {
  return {
    id: entry.id,
    title: entry.title,
    href: publicArticleHref(entry),
  };
}

export const loader = defineHandler(async () => {
  if (readsDevCatalog()) {
    return { entries: publicEntries().map(titleEntry) };
  }
  const stored = await listPublicTitles(editArticleDatabase());
  return { entries: stored.map(titleEntry) };
});
