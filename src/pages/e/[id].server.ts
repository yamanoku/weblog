import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { verifiedOwner } from "../../middleware/01.access.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { entryImageViews } from "../../store/entry-images.ts";
import { listPublicNoteThread } from "../../store/edit-note.ts";
import { hasTombstone, readStoredEntry } from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

function editableKind(kind: string | undefined): boolean {
  return kind === "article" || kind === "bookmark";
}

function privateOwner(c: { header: (name: string, value: string) => void }) {
  c.header("cache-control", "private, no-store");
  c.header("vary", "Cookie");
}

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  const owner = readsDevCatalog() || (await verifiedOwner(c));
  const refused = owner && c.req.query("refused") === "empty_body" ? "empty_body" : null;
  if (readsDevCatalog()) {
    const entry = entryById(id);
    if (entry?.kind === "note" && entry.visibility === "public") {
      privateOwner(c);
      return {
        entry: null,
        thread: [{ id: entry.id, body: entry.body, replyToId: null }],
        owner: true,
        refused,
      };
    }
    const showEdit = owner && editableKind(entry?.kind);
    if (showEdit) privateOwner(c);
    return { entry, thread: null, owner: showEdit, refused: null };
  }
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (stored?.visibility === "public" && stored.kind === "note") {
    if (owner) privateOwner(c);
    return {
      entry: null,
      thread: await listPublicNoteThread(editArticleDatabase(), id),
      owner,
      refused,
    };
  }
  if (stored?.visibility === "public") {
    const showEdit = owner && editableKind(stored.kind);
    if (showEdit) privateOwner(c);
    const images =
      stored.kind === "bookmark"
        ? ((await entryImageViews(editArticleDatabase(), [id])).get(id) ?? [])
        : [];
    return {
      entry: {
        id,
        title: stored.title,
        kind: stored.kind,
        body: stored.body,
        bookmarkUrl: stored.bookmarkUrl,
        images,
      },
      thread: null,
      owner: showEdit,
      refused: null,
    };
  }
  if (await hasTombstone(editArticleDatabase(), id)) {
    throw new HTTPException(410, { message: "Gone" });
  }
  throw new HTTPException(404, { message: "Not found" });
});
