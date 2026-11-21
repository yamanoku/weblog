import { HTTPException } from "hono/http-exception";
import { deliverableEntries } from "../domain/catalog.ts";
import { postedNoteUrl } from "../domain/edit-note.ts";
import {
  homePageCount,
  homePageSize,
  homePageSlice,
  parseHomePage,
} from "../domain/home-page.ts";
import { publicEntryHref } from "../domain/public-article.ts";
import { defineHandler } from "void";
import { verifiedOwner } from "../middleware/01.access.ts";
import { editArticleDatabase } from "../store/edit-article.ts";
import { entryImageViews } from "../store/entry-images.ts";
import { noteImageViews } from "../store/edit-note.ts";
import { listDeliverableEntryPage, readStoredEntry } from "../store/entries.ts";
import { readsDevCatalog } from "../store/read-source.ts";

function homeEntry(
  entry: {
    id: string;
    title: string;
    kind: string;
    body: string;
    bookmarkUrl?: string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
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
    publishedAt: entry.publishedAt ?? null,
    updatedAt: entry.updatedAt ?? entry.publishedAt ?? null,
  };
}

function rejectHomePage(raw: string | undefined): number {
  const page = parseHomePage(raw);
  if (page !== null) return page;
  throw new HTTPException(400, {
    res: new Response("invalid_page", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  });
}

export const loader = defineHandler(async (c) => {
  const page = rejectHomePage(c.req.query("page"));
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
    const stored = deliverableEntries();
    const pageCount = homePageCount(stored.length);
    if (page > pageCount) throw new HTTPException(404, { message: "Not a page" });
    return {
      entries: homePageSlice(stored, page).map((entry) => homeEntry(entry)),
      owner,
      postedNote,
      page,
      pageCount,
    };
  }
  const database = editArticleDatabase();
  const listed = await listDeliverableEntryPage(database, page, homePageSize);
  const pageCount = homePageCount(listed.total);
  if (page > pageCount) throw new HTTPException(404, { message: "Not a page" });
  const images = await noteImageViews(
    database,
    listed.rows.filter((entry) => entry.kind === "note").map((entry) => entry.id),
  );
  const galleries = await entryImageViews(
    database,
    listed.rows
      .filter((entry) => entry.kind === "bookmark")
      .map((entry) => entry.id),
  );
  return {
    entries: listed.rows.map((entry) => {
      const image = images.get(entry.id);
      return homeEntry(entry, image?.href ?? null, image?.alt ?? null, galleries.get(entry.id) ?? []);
    }),
    owner,
    postedNote,
    page,
    pageCount,
  };
});
