import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { verifiedOwner } from "../../middleware/01.access.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { listPublicNoteThread } from "../../store/edit-note.ts";
import { hasTombstone, readStoredEntry } from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  const owner = readsDevCatalog() || (await verifiedOwner(c));
  const refused = owner && c.req.query("refused") === "empty_body" ? "empty_body" : null;
  if (readsDevCatalog()) {
    const entry = entryById(id);
    if (entry?.kind === "note" && entry.visibility === "public") {
      c.header("cache-control", "private, no-store");
      c.header("vary", "Cookie");
      return {
        entry: null,
        thread: [{ id: entry.id, body: entry.body, replyToId: null }],
        owner: true,
        refused,
      };
    }
    return { entry, thread: null, owner: false, refused: null };
  }
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (stored?.visibility === "public" && stored.kind === "note") {
    if (owner) {
      c.header("cache-control", "private, no-store");
      c.header("vary", "Cookie");
    }
    return {
      entry: null,
      thread: await listPublicNoteThread(editArticleDatabase(), id),
      owner,
      refused,
    };
  }
  if (stored?.visibility === "public") {
    return {
      entry: { id, title: stored.title, kind: stored.kind, body: stored.body },
      thread: null,
      owner: false,
      refused: null,
    };
  }
  if (await hasTombstone(editArticleDatabase(), id)) {
    throw new HTTPException(410, { message: "Gone" });
  }
  throw new HTTPException(404, { message: "Not found" });
});
