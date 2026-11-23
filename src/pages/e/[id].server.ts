import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { entryById } from "../../domain/catalog.ts";
import { publicDocumentTitle } from "../../domain/public-article.ts";
import { verifiedOwner } from "../../middleware/01.access.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { entryImageViews } from "../../store/entry-images.ts";
import { resolveSpeakerDeckPlayers } from "../../domain/speakerdeck.ts";
import { gyazoIndexForBody } from "../../store/gyazo-objects.ts";
import { listPublicNoteThread } from "../../store/edit-note.ts";
import { hasTombstone, readStoredEntry } from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

function editableKind(kind: string | undefined): boolean {
  return kind === "article" || kind === "bookmark" || kind === "page";
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
        headTitle: publicDocumentTitle(entry),
      };
    }
    const showEdit = owner && editableKind(entry?.kind);
    if (showEdit) privateOwner(c);
    return {
      entry,
      thread: null,
      owner: showEdit,
      refused: null,
      headTitle: publicDocumentTitle(entry),
    };
  }
  const stored = await readStoredEntry(editArticleDatabase(), id);
  if (stored?.visibility === "public" && stored.kind === "note") {
    if (owner) privateOwner(c);
    return {
      entry: null,
      thread: await listPublicNoteThread(editArticleDatabase(), id),
      owner,
      refused,
      headTitle: publicDocumentTitle({ title: stored.title, id }),
    };
  }
  if (stored?.visibility === "public") {
    const showEdit = owner && editableKind(stored.kind);
    if (showEdit) privateOwner(c);
    const images =
      stored.kind === "bookmark"
        ? ((await entryImageViews(editArticleDatabase(), [id])).get(id) ?? [])
        : [];
    const gyazo = await gyazoIndexForBody(editArticleDatabase(), stored.body);
    const speakerdeck = await resolveSpeakerDeckPlayers([stored.body, stored.bookmarkUrl ?? ""]);
    return {
      entry: {
        id,
        title: stored.title,
        kind: stored.kind,
        body: stored.body,
        bookmarkUrl: stored.bookmarkUrl,
        images,
        gyazo,
        speakerdeck,
      },
      thread: null,
      owner: showEdit,
      refused: null,
      headTitle: publicDocumentTitle({ title: stored.title, id }),
    };
  }
  if (await hasTombstone(editArticleDatabase(), id)) {
    throw new HTTPException(410, { message: "Gone" });
  }
  throw new HTTPException(404, { message: "Not found" });
});
