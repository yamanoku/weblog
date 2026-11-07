import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { publicArticleFields } from "../../domain/edit-article.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { readStoredEntry } from "../../store/entries.ts";

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (stored) {
    const article = publicArticleFields(stored);
    if (!article) throw new HTTPException(404, { message: "Not found" });
    return { entry: { id, title: article.title, kind: "article", body: article.body } };
  }
  return { entry: entryById(id) };
});
