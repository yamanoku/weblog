import { storage } from "void/storage";
import type { NoteImageBytes } from "../domain/note-image.ts";
import type { NoteImageObjects } from "./edit-note.ts";

function noteImageKey(id: string): string {
  return `notes/${id}`;
}

// Bytes for a home-page note. The key is the entry id, not a name from the upload.
export const noteImageObjects: NoteImageObjects & {
  get(id: string): Promise<{ body: ReadableStream; mediaType: string } | null>;
} = {
  async put(id, image: NoteImageBytes) {
    await storage.put(noteImageKey(id), image.bytes, {
      httpMetadata: { contentType: image.mediaType },
    });
  },
  async delete(id) {
    await storage.delete(noteImageKey(id));
  },
  async get(id) {
    const object = await storage.get(noteImageKey(id));
    if (!object) return null;
    return {
      body: object.body,
      mediaType: object.httpMetadata?.contentType ?? "",
    };
  },
};
