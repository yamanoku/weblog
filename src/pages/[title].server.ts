import { HTTPException } from "hono/http-exception";
import { isReservedTitle, publicEntryByTitle } from "../domain/catalog.ts";
import { publicDocumentTitle } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { entryImageViews } from "../store/entry-images.ts";
import { gyazoIndexForBody } from "../store/gyazo-objects.ts";
import { readPublicEntryByPath } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function editableKind(kind: string | undefined): boolean {
  return kind === "article" || kind === "bookmark";
}

export const loader = defineHandler(async (c) => {
  const title = c.req.param("title") ?? "";
  if (isReservedTitle(title)) {
    throw new HTTPException(404, { message: "Not a title" });
  }
  // Local `vp dev` has no Access login. A deployed title page includes the link only for the owner.
  const owner = readsDevCatalog() || (await verifiedOwner(c));
  if (readsDevCatalog()) {
    const entry = publicEntryByTitle(title);
    if (owner && editableKind(entry?.kind)) {
      c.header("cache-control", "private, no-store");
      c.header("vary", "Cookie");
    }
    return { entry, owner, headTitle: publicDocumentTitle(entry) };
  }
  const entry = await readPublicEntryByPath(editArticleDatabase(), title);
  if (!entry) return { entry: null, owner: false, headTitle: publicDocumentTitle(null) };
  if (owner && editableKind(entry.kind)) {
    c.header("cache-control", "private, no-store");
    c.header("vary", "Cookie");
  }
  const images =
    entry.kind === "bookmark"
      ? ((await entryImageViews(editArticleDatabase(), [entry.id])).get(entry.id) ?? [])
      : [];
  const gyazo = await gyazoIndexForBody(editArticleDatabase(), entry.body);
  return { entry: { ...entry, images, gyazo }, owner, headTitle: publicDocumentTitle(entry) };
});
