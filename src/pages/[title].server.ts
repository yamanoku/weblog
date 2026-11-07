import { HTTPException } from "hono/http-exception";
import { isReservedTitle, publicEntryByTitle } from "../domain/catalog.ts";
import { publicArticleMatchesPath } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { editArticleDatabase, listPublicArticles } from "../store/edit-article.ts";

export const loader = defineHandler(async (c) => {
  const title = c.req.param("title") ?? "";
  if (isReservedTitle(title)) {
    throw new HTTPException(404, { message: "Not a title" });
  }
  const stored = await listPublicArticles(editArticleDatabase());
  const article = stored.find((entry) => publicArticleMatchesPath(entry.title, title));
  if (article) return { entry: { title: article.title, kind: "article", body: article.body } };
  return { entry: publicEntryByTitle(title) };
});
