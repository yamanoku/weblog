import {
  acceptNoteImage,
  decodeNoteImage,
  noteImageAltLimit,
  noteImagePath,
  type NoteImageBytes,
  type NoteImageError,
} from "./note-image.ts";

export type EntryImageDraft = {
  id: string;
  alt: string;
  image: NoteImageBytes | null;
};

const entryImageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Alternative text is optional. Ends are removed. Only whitespace is stored as empty.
export function entryImageAlt(value: unknown): { alt: string } | { error: "image_alt_length" } {
  const text = typeof value === "string" ? value.trim() : "";
  if ([...text].length > noteImageAltLimit) return { error: "image_alt_length" };
  return { alt: text };
}

// Copies the current alt into Markdown. Brackets and line breaks are not part of that copy.
export function entryImageMarkdown(alt: string, id: string): string {
  const label = alt.replaceAll(/[\[\]\r\n]/g, " ");
  return `![${label}](${noteImagePath(id)})`;
}

// The edit form sends an ordered list. A missing list means no images.
export async function entryImagesFromField(
  value: unknown,
): Promise<{ images: EntryImageDraft[] } | { error: NoteImageError | "image_alt_length" }> {
  if (value === undefined || value === null) return { images: [] };
  if (!Array.isArray(value)) return { error: "image_type" };
  const images: EntryImageDraft[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { error: "image_type" };
    const record = item as { id?: unknown; alt?: unknown; data?: unknown };
    if (typeof record.id !== "string" || !entryImageIdPattern.test(record.id) || seen.has(record.id)) {
      return { error: "image_type" };
    }
    seen.add(record.id);
    const alt = entryImageAlt(record.alt);
    if ("error" in alt) return alt;
    let image: NoteImageBytes | null = null;
    if (record.data !== undefined && record.data !== null && record.data !== "") {
      if (typeof record.data !== "string") return { error: "image_type" };
      const bytes = decodeNoteImage(record.data);
      if (!bytes) return { error: "image_type" };
      const accepted = acceptNoteImage(bytes);
      if ("error" in accepted) return accepted;
      image = accepted.image;
    }
    images.push({ id: record.id, alt: alt.alt, image });
  }
  return { images };
}
