import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { readStoredEntry } from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  if (readsDevCatalog()) {
    return { entry: entryById(id) };
  }
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (!stored || stored.visibility !== "public") {
    throw new HTTPException(404, { message: "Not found" });
  }
  return {
    entry: { id, title: stored.title, kind: stored.kind, body: stored.body },
  };
});
