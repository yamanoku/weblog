import { deliverableEntries } from "../domain/catalog.ts";
import { postedNoteUrl } from "../domain/edit-note.ts";
import { publicEntryHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { listDeliverableEntries, readStoredEntry } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function homeEntry(entry: {
  id: string;
  title: string;
  kind: string;
  body: string;
  bookmarkUrl?: string | null;
}) {
  return {
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    body: entry.body,
    href: publicEntryHref(entry),
  };
}

export const loader = defineHandler(async (c) => {
  // Local `vp dev` has no Access login. A deployed home page includes the field only for the owner.
  const owner = readsDevCatalog() || (await verifiedOwner(c));
  if (owner) {
    c.header("cache-control", "private, no-store");
    c.header("vary", "Cookie");
  }
  const postedId = owner ? (c.req.query("posted") ?? "") : "";
  const postedEntry =
    postedId === "" || readsDevCatalog()
      ? null
      : await readStoredEntry(editArticleDatabase(), postedId);
  const postedNote = postedNoteUrl(postedEntry);
  if (readsDevCatalog()) {
    return { entries: deliverableEntries().map(homeEntry), owner, postedNote };
  }
  const stored = await listDeliverableEntries(editArticleDatabase());
  return { entries: stored.map(homeEntry), owner, postedNote };
});
