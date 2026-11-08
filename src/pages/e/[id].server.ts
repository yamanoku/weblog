import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { hasTombstone, readStoredEntry } from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  if (readsDevCatalog()) {
    return { entry: entryById(id) };
  }
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (stored?.visibility === "public") {
    return {
      entry: { id, title: stored.title, kind: stored.kind, body: stored.body },
    };
  }
  if (await hasTombstone(editArticleDatabase(), id)) {
    throw new HTTPException(410, { message: "Gone" });
  }
  throw new HTTPException(404, { message: "Not found" });
});
