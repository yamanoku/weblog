import { defineHandler } from "void";
import { noteImageIsPublic } from "../../domain/note-image.ts";
import { editArticleDatabase } from "../../store/edit-article.ts";
import { readNoteImage } from "../../store/edit-note.ts";
import { readStoredEntry } from "../../store/entries.ts";
import { noteImageObjects } from "../../store/note-image-object.ts";

export const GET = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  const entry = id === "" ? null : await readStoredEntry(editArticleDatabase(), id);
  const row = entry ? await readNoteImage(editArticleDatabase(), id) : null;
  if (!noteImageIsPublic(entry, row?.mediaType ?? null)) {
    return c.notFound();
  }
  const object = await noteImageObjects.get(id);
  if (!object) return c.notFound();
  const headers = new Headers();
  headers.set("content-type", row?.mediaType ?? "application/octet-stream");
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("content-security-policy", "default-src 'none'");
  return new Response(object.body, { headers });
});
