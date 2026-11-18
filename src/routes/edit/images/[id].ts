import { defineHandler } from "void";
import { editArticleDatabase } from "../../../store/edit-article.ts";
import { readNoteImage } from "../../../store/edit-note.ts";
import { noteImageObjects } from "../../../store/note-image-object.ts";

// Owner preview. Access already covers /edit/*. Draft bytes stay off the public URL.
export const GET = defineHandler(async (c) => {
  const id = c.req.param("id") ?? "";
  const row = id === "" ? null : await readNoteImage(editArticleDatabase(), id);
  if (!row) return c.notFound();
  const object = await noteImageObjects.get(id);
  if (!object) return c.notFound();
  const headers = new Headers();
  headers.set("content-type", row.mediaType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "private, no-store");
  headers.set("content-security-policy", "default-src 'none'");
  return new Response(object.body, { headers });
});
