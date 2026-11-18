import { HTTPException } from "hono/http-exception";
import { isReservedTitle, publicEntryByTitle } from "../domain/catalog.ts";
import { defineHandler } from "void";
import { editArticleDatabase } from "../store/edit-article.ts";
import { entryImageViews } from "../store/entry-images.ts";
import { readPublicEntryByPath } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

export const loader = defineHandler(async (c) => {
  const title = c.req.param("title") ?? "";
  if (isReservedTitle(title)) {
    throw new HTTPException(404, { message: "Not a title" });
  }
  if (readsDevCatalog()) {
    return { entry: publicEntryByTitle(title) };
  }
  const entry = await readPublicEntryByPath(editArticleDatabase(), title);
  if (!entry) return { entry: null };
  const galleries = await entryImageViews(editArticleDatabase(), [entry.id]);
  return { entry: { ...entry, images: galleries.get(entry.id) ?? [] } };
});
