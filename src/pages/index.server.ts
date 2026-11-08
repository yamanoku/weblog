import { deliverableEntries } from "../domain/catalog.ts";
import { publicArticleHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { editArticleDatabase } from "../store/edit-article.ts";
import { listDeliverableEntries } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function homeEntry(entry: { id: string; title: string; kind: string; body: string }) {
  return {
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    body: entry.body,
    href: publicArticleHref(entry),
  };
}

export const loader = defineHandler(async () => {
  if (readsDevCatalog()) {
    return { entries: deliverableEntries().map(homeEntry) };
  }
  const stored = await listDeliverableEntries(editArticleDatabase());
  return { entries: stored.map(homeEntry) };
});
