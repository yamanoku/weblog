import { HTTPException } from "hono/http-exception";
import { defineHandler } from "void";
import { ValidationError } from "void/handler";
import { entryImagesFromField } from "../../domain/entry-image.ts";
import { editArticleDatabase, updateArticleFromEdit } from "../../store/edit-article.ts";
import { updatePageFromEdit } from "../../store/edit-page.ts";
import { updateBookmarkFromEdit } from "../../store/edit-bookmark.ts";
import { entryImagesForEdit } from "../../store/entry-images.ts";
import { noteImageObjects } from "../../store/note-image-object.ts";
import { readStoredEntry } from "../../store/entries.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const loader = defineHandler(async (c) => {
  const entry = await readStoredEntry(editArticleDatabase(), c.req.param("id") ?? "");
  if (!entry || (entry.kind !== "article" && entry.kind !== "bookmark" && entry.kind !== "page")) {
    throw new HTTPException(404, { message: "Not found" });
  }
  return {
    entry,
    images: await entryImagesForEdit(editArticleDatabase(), entry.id),
  };
});

async function postedRecord(c: {
  req: {
    header: (name: string) => string | undefined;
    json: () => Promise<unknown>;
    parseBody: () => Promise<Record<string, unknown>>;
  };
}): Promise<Record<string, unknown>> {
  const type = (c.req.header("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) return c.req.parseBody();
  const payload = await c.req.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
}

function imageFailure(error: string): never {
  if (error === "image_store") throw new HTTPException(503, { message: "store_unavailable" });
  throw new ValidationError({ entryImages: error });
}

export const action = defineHandler(async (c) => {
  const posted = await postedRecord(c);
  const id = c.req.param("id") ?? "";
  const current = await readStoredEntry(editArticleDatabase(), id);
  if (!current || (current.kind !== "article" && current.kind !== "bookmark" && current.kind !== "page")) {
    throw new HTTPException(404, { message: "not_found" });
  }
  const parsed = "entryImages" in posted ? await entryImagesFromField(posted.entryImages) : null;
  if (parsed && "error" in parsed) imageFailure(parsed.error);
  const images = parsed && "images" in parsed ? parsed.images : null;
  const fields = {
    title: postedText(posted.title),
    body: postedText(posted.body),
    visibility: postedText(posted.visibility),
  };
  const result =
    current.kind === "bookmark"
      ? await updateBookmarkFromEdit(
          editArticleDatabase(),
          id,
          { ...fields, bookmarkUrl: postedText(posted.bookmarkUrl) },
          new Date().toISOString(),
          images,
          noteImageObjects,
        )
      : current.kind === "page"
        ? await updatePageFromEdit(
            editArticleDatabase(),
            id,
            { title: fields.title, body: fields.body },
            new Date().toISOString(),
            images,
            noteImageObjects,
          )
        : await updateArticleFromEdit(
            editArticleDatabase(),
            id,
            fields,
            new Date().toISOString(),
            images,
            noteImageObjects,
          );
  if ("error" in result) {
    if (result.error === "image_store" || result.error === "image_type" || result.error === "image_alt_length") {
      imageFailure(result.error);
    }
    const status = result.error === "not_found" ? 404 : 422;
    throw new HTTPException(status, { message: result.error });
  }
});
