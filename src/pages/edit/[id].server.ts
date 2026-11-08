import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { editArticleDatabase, updateArticleFromEdit } from "../../store/edit-article.ts";
import { updateBookmarkFromEdit } from "../../store/edit-bookmark.ts";
import { readStoredEntry } from "../../store/entries.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const loader = defineHandler(async (c) => {
  const entry = await readStoredEntry(editArticleDatabase(), c.req.param("id") ?? "");
  if (!entry || (entry.kind !== "article" && entry.kind !== "bookmark")) {
    throw new HTTPException(404, { message: "Not found" });
  }
  return { entry };
});

export const action = defineHandler(async (c) => {
  const posted = await c.req.parseBody();
  const id = c.req.param("id") ?? "";
  const current = await readStoredEntry(editArticleDatabase(), id);
  if (!current || (current.kind !== "article" && current.kind !== "bookmark")) {
    throw new HTTPException(404, { message: "not_found" });
  }
  const fields = {
    title: postedText(posted.title),
    body: postedText(posted.body),
    visibility: postedText(posted.visibility),
  };
  const result =
    current.kind === "bookmark"
      ? await updateBookmarkFromEdit(editArticleDatabase(), id, {
          ...fields,
          bookmarkUrl: postedText(posted.bookmarkUrl),
        })
      : await updateArticleFromEdit(editArticleDatabase(), id, fields);
  if ("error" in result) {
    const status = result.error === "not_found" ? 404 : 422;
    throw new HTTPException(status, { message: result.error });
  }
});
