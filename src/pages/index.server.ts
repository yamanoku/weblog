import { deliverableEntries } from "../domain/catalog.ts";
import { postedNoteUrl } from "../domain/edit-note.ts";
import { publicEntryHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { entryImageViews } from "../store/entry-images.ts";
import { noteImageViews } from "../store/edit-note.ts";
import { listDeliverableEntries, readStoredEntry } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function homeEntry(
  entry: {
    id: string;
    title: string;
    kind: string;
    body: string;
    bookmarkUrl?: string | null;
  },
  imageHref: string | null = null,
  imageAlt: string | null = null,
  images: { href: string; alt: string }[] = [],
) {
  return {
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    body: entry.body,
    href: publicEntryHref(entry),
    imageHref,
    imageAlt,
    images,
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
    return { entries: deliverableEntries().map((entry) => homeEntry(entry)), owner, postedNote };
  }
  const database = editArticleDatabase();
  const stored = await listDeliverableEntries(database);
  const images = await noteImageViews(
    database,
    stored.filter((entry) => entry.kind === "note").map((entry) => entry.id),
  );
  const galleries = await entryImageViews(
    database,
    stored
      .filter((entry) => entry.kind === "bookmark")
      .map((entry) => entry.id),
  );
  return {
    entries: stored.map((entry) => {
      const image = images.get(entry.id);
      return homeEntry(entry, image?.href ?? null, image?.alt ?? null, galleries.get(entry.id) ?? []);
    }),
    owner,
    postedNote,
  };
});
