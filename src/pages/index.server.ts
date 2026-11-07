import { deliverableEntries } from "../domain/catalog.ts";
import { publicArticleHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { editArticleDatabase, listPublicArticles } from "../store/edit-article.ts";

export const loader = defineHandler(async () => {
  const stored = await listPublicArticles(editArticleDatabase());
  const articles = stored.map((entry) => ({
    id: entry.id,
    title: entry.title,
    kind: "article",
    body: entry.body,
    href: publicArticleHref(entry),
  }));
  const samples = deliverableEntries().map((entry) => ({
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    body: entry.body,
    href: "/" + entry.title,
  }));
  return { entries: [...articles, ...samples] };
});
