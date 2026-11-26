import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { catalogSameDayLinks, entryById } from "../../domain/catalog.ts";
import { isDatedDiaryTitle } from "../../domain/home-calendar.ts";
import { publicDocumentTitle } from "../../domain/public-article.ts";
import { verifiedOwner } from "../../middleware/01.access.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { entryImageViews } from "../../store/entry-images.ts";
import { resolveSpeakerDeckPlayers } from "../../domain/speakerdeck.ts";
import { gyazoIndexForBody } from "../../store/gyazo-objects.ts";
import { pageIconsForBody } from "../../store/page-icons.ts";
import { listPublicNoteThread } from "../../store/edit-note.ts";
import {
  hasTombstone,
  listSameDayLinks,
  readStoredEntry,
  type StoredEntry,
} from "../../store/entries.ts";
import { readsDevCatalog } from "../../store/read-source.ts";

function editableKind(kind: string | undefined): boolean {
  return kind === "article" || kind === "diary" || kind === "bookmark" || kind === "page";
}

function datedDiaryLinks(entry: { kind: string; title: string } | null | undefined): string | null {
  if (!entry || !isDatedDiaryTitle(entry)) return null;
  return entry.title;
}

function privateOwner(c: { header: (name: string, value: string) => void }) {
  c.header("cache-control", "private, no-store");
  c.header("vary", "Cookie");
}

async function renderedEntry(stored: StoredEntry) {
  const images =
    stored.kind === "bookmark"
      ? ((await entryImageViews(editArticleDatabase(), [stored.id])).get(stored.id) ?? [])
      : [];
  const gyazo =
    stored.kind === "note" ? {} : await gyazoIndexForBody(editArticleDatabase(), stored.body);
  const icons =
    stored.kind === "note" ? {} : await pageIconsForBody(editArticleDatabase(), stored.body);
  const speakerdeck =
    stored.kind === "note"
      ? {}
      : await resolveSpeakerDeckPlayers([stored.body, stored.bookmarkUrl ?? ""]);
  return {
    id: stored.id,
    title: stored.title,
    kind: stored.kind,
    body: stored.body,
    bookmarkUrl: stored.bookmarkUrl,
    images,
    gyazo,
    icons,
    speakerdeck,
  };
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
        sameDay: [],
      };
    }
    const showEdit = owner && editableKind(entry?.kind);
    if (showEdit || entry?.visibility === "draft") privateOwner(c);
    const date = datedDiaryLinks(entry);
    return {
      entry,
      thread: null,
      owner: showEdit,
      refused: null,
      draft: entry?.visibility === "draft",
      headTitle: publicDocumentTitle(entry),
      sameDay: date ? catalogSameDayLinks(date) : [],
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
      draft: false,
      headTitle: publicDocumentTitle({ title: stored.title, id }),
      sameDay: [],
    };
  }
  if (stored && (stored.visibility === "public" || (stored.visibility === "draft" && owner))) {
    const showEdit = owner && editableKind(stored.kind);
    if (showEdit || stored.visibility === "draft") privateOwner(c);
    const date = datedDiaryLinks(stored);
    return {
      entry: await renderedEntry(stored),
      thread: null,
      owner: showEdit,
      refused: null,
      draft: stored.visibility === "draft",
      headTitle: publicDocumentTitle({ title: stored.title, id }),
      sameDay: date ? await listSameDayLinks(editArticleDatabase(), date) : [],
    };
  }
  if (await hasTombstone(editArticleDatabase(), id)) {
    throw new HTTPException(410, { message: "Gone" });
  }
  throw new HTTPException(404, { message: "Not found" });
});
