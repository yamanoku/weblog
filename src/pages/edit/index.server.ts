import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { ValidationError } from "void/handler";
import { noteBodyField, noteDeleteId, postedNoteUrl } from "../../domain/edit-note.ts";
import {
  editArticleDatabase,
  listArticlesForEdit,
  submitArticleFromEdit,
} from "../../store/edit-article.ts";
import { deleteNoteFromEdit, listNotesForEdit, submitNoteFromEdit } from "../../store/edit-note.ts";
import { readStoredEntry } from "../../store/entries.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function postedQuery(value: string | undefined): string {
  return value ?? "";
}

export const loader = defineHandler(async (c) => {
  const id = postedQuery(c.req.query("posted"));
  const entry = id === "" ? null : await readStoredEntry(editArticleDatabase(), id);
  return {
    articles: await listArticlesForEdit(editArticleDatabase()),
    notes: await listNotesForEdit(editArticleDatabase()),
    postedNote: postedNoteUrl(entry),
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
    return c.redirect(`/edit?posted=${result.id}`);
  }),
  deleteNote: defineHandler(async (c) => {
    const posted = await c.req.parseBody();
    const target = noteDeleteId(posted);
    if ("error" in target) throw new HTTPException(404, { message: "not_found" });
    const result = await deleteNoteFromEdit(editArticleDatabase(), target.id);
    if ("error" in result) throw new HTTPException(404, { message: "not_found" });
  }),
};
