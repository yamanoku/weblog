import { HTTPException } from "hono/http-exception";
import { isReservedTitle, publicEntryByTitle } from "../domain/catalog.ts";
import { publicAbsoluteHref, publicDocumentTitle } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { entryImageViews } from "../store/entry-images.ts";
import { resolveSpeakerDeckPlayers } from "../domain/speakerdeck.ts";
import { gyazoIndexForBody } from "../store/gyazo-objects.ts";
import { pageIconsForBody } from "../store/page-icons.ts";
import { readPublicEntryByPath, readPublicPathRedirect } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function editableKind(kind: string | undefined): boolean {
  return kind === "article" || kind === "bookmark" || kind === "page";
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
    if (owner && (!entry || editableKind(entry.kind))) {
      c.header("cache-control", "private, no-store");
      c.header("vary", "Cookie");
    }
    return {
      entry,
      owner,
      headTitle: publicDocumentTitle(entry),
      requestedTitle: entry ? "" : title,
    };
  }
  const entry = await readPublicEntryByPath(editArticleDatabase(), title);
  if (!entry) {
    const redirect = await readPublicPathRedirect(editArticleDatabase(), title);
    if (redirect) {
      c.header("cache-control", "no-cache");
      return c.redirect(publicAbsoluteHref(redirect), 301);
    }
    if (owner) {
      c.header("cache-control", "private, no-store");
      c.header("vary", "Cookie");
    }
    return { entry: null, owner, headTitle: publicDocumentTitle(null), requestedTitle: title };
  }
  if (owner && editableKind(entry.kind)) {
    c.header("cache-control", "private, no-store");
    c.header("vary", "Cookie");
  }
  const images =
    entry.kind === "bookmark"
      ? ((await entryImageViews(editArticleDatabase(), [entry.id])).get(entry.id) ?? [])
      : [];
  const gyazo = await gyazoIndexForBody(editArticleDatabase(), entry.body);
  const icons = entry.kind === "note" ? {} : await pageIconsForBody(editArticleDatabase(), entry.body);
  const speakerdeck =
    entry.kind === "note"
      ? {}
      : await resolveSpeakerDeckPlayers([entry.body, entry.bookmarkUrl ?? ""]);
  return {
    entry: { ...entry, images, gyazo, speakerdeck, icons },
    owner,
    headTitle: publicDocumentTitle(entry),
  };
});
