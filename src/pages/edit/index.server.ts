import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { ValidationError } from "void/handler";
import { bookmarkDeleteId } from "../../domain/edit-bookmark.ts";
import { noteBodyField, noteDeleteId, replyToField } from "../../domain/edit-note.ts";
import {
  deleteBookmarkFromEdit,
  listBookmarksForEdit,
  submitBookmarkFromEdit,
} from "../../store/edit-bookmark.ts";
import {
  editArticleDatabase,
  listArticlesForEdit,
  submitArticleFromEdit,
} from "../../store/edit-article.ts";
import {
  deleteNoteFromEdit,
  listNotesForEdit,
  submitNoteFromEdit,
  submitReplyFromEdit,
} from "../../store/edit-note.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const loader = defineHandler(async () => {
  return {
    articles: await listArticlesForEdit(editArticleDatabase()),
    notes: await listNotesForEdit(editArticleDatabase()),
    bookmarks: await listBookmarksForEdit(editArticleDatabase()),
  };
});

export const actions = {
  default: defineHandler(async (c) => {
    const posted = await c.req.parseBody();
    await submitArticleFromEdit(editArticleDatabase(), {
      title: postedText(posted.title),
      body: postedText(posted.body),
    });
  }),
  note: defineHandler(async (c) => {
    const type = (c.req.header("content-type") ?? "").toLowerCase();
    // parseBody reads form posts only. The note form sends JSON, which parseBody turns into {}.
    const payload = type.includes("application/json")
      ? await c.req.json().catch(() => null)
      : await c.req.parseBody();
    const result = await submitNoteFromEdit(editArticleDatabase(), noteBodyField(payload));
    if ("error" in result) {
      throw new ValidationError({ noteBody: result.error });
    }
    return c.redirect(`/?posted=${result.id}`);
  }),
  reply: defineHandler(async (c) => {
    const type = (c.req.header("content-type") ?? "").toLowerCase();
    const payload = type.includes("application/json")
      ? await c.req.json().catch(() => null)
      : await c.req.parseBody();
    const result = await submitReplyFromEdit(
      editArticleDatabase(),
      noteBodyField(payload),
      replyToField(payload),
    );
    if ("error" in result) {
      if (result.error === "empty_body") return c.redirect(`/e/${result.id}?refused=empty_body`);
      throw new HTTPException(404, { message: "not_found" });
    }
    return c.redirect(`/e/${result.id}`);
  }),
  deleteNote: defineHandler(async (c) => {
    const posted = await c.req.parseBody();
    const target = noteDeleteId(posted);
    if ("error" in target) throw new HTTPException(404, { message: "not_found" });
    const result = await deleteNoteFromEdit(editArticleDatabase(), target.id);
    if ("error" in result) throw new HTTPException(404, { message: "not_found" });
  }),
  bookmark: defineHandler(async (c) => {
    const posted = await c.req.parseBody();
    const result = await submitBookmarkFromEdit(editArticleDatabase(), {
      title: postedText(posted.title),
      body: postedText(posted.body),
      bookmarkUrl: postedText(posted.bookmarkUrl),
    });
    if ("error" in result) throw new HTTPException(422, { message: result.error });
  }),
  deleteBookmark: defineHandler(async (c) => {
    const posted = await c.req.parseBody();
    const target = bookmarkDeleteId(posted);
    if ("error" in target) throw new HTTPException(404, { message: "not_found" });
    const result = await deleteBookmarkFromEdit(editArticleDatabase(), target.id);
    if ("error" in result) throw new HTTPException(404, { message: "not_found" });
  }),
};
