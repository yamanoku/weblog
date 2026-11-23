// One still image on a home-page note. The body text stays what the owner typed.
// The canonical host does not follow the request Host header.

export const noteImageByteLimit = 8 * 1024 * 1024;

// This host stores at most 1500 Unicode scalar values of alternative text.
export const noteImageAltLimit = 1500;

export const noteImageMediaTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

export type NoteImageMediaType = (typeof noteImageMediaTypes)[number];

export type NoteImageBytes = {
  mediaType: NoteImageMediaType;
  bytes: Uint8Array;
};

export type NoteImageError = "image_type" | "image_too_large" | "image_count";

export type NoteImageAltError = "image_alt" | "image_alt_length";

export function noteImagePath(id: string): string {
  return `/note-images/${id}`;
}

export function noteImageCanonicalUrl(id: string): string {
  return `https://weblog.yamanoku.net/note-images/${id}`;
}

// Mastodon reads a Note attachment whose type is Image.
// https://docs.joinmastodon.org/spec/activitypub/
export function noteActivityAttachment(id: string, mediaType: NoteImageMediaType, name: string) {
  return {
    type: "Image",
    mediaType,
    url: noteImageCanonicalUrl(id),
    name,
  };
}

// Alternative text is required only when an image is attached.
// Ends are removed. A value of only whitespace is missing.
export function noteImageAlt(
  value: unknown,
  hasImage: boolean,
): { alt: string | null } | { error: NoteImageAltError } {
  if (!hasImage) return { alt: null };
  const text = typeof value === "string" ? value.trim() : "";
  if (text === "") return { error: "image_alt" };
  if ([...text].length > noteImageAltLimit) return { error: "image_alt_length" };
  return { alt: text };
}

export function sniffNoteImage(bytes: Uint8Array): NoteImageMediaType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 6) {
    const head = String.fromCharCode(
      bytes[0]!,
      bytes[1]!,
      bytes[2]!,
      bytes[3]!,
      bytes[4]!,
      bytes[5]!,
    );
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
    const webp = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  }
  return null;
}

export function acceptNoteImage(
  bytes: Uint8Array,
): { image: NoteImageBytes } | { error: NoteImageError } {
  if (bytes.byteLength > noteImageByteLimit) return { error: "image_too_large" };
  const mediaType = sniffNoteImage(bytes);
  if (!mediaType) return { error: "image_type" };
  return { image: { mediaType, bytes } };
}

export function encodeNoteImage(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let index = 0; index < bytes.length; index += 8192) {
    const slice = bytes.subarray(index, index + 8192);
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(""));
}

export function decodeNoteImage(value: string): Uint8Array | null {
  if (value.length === 0 || value.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function isBlob(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

// The note form sends one base64 string. A file input sends one blob. More than one file is refused.
export async function noteImageFromField(
  value: unknown,
): Promise<{ image: NoteImageBytes | null } | { error: NoteImageError }> {
  if (value === undefined || value === null || value === "") return { image: null };
  if (Array.isArray(value)) {
    if (value.length > 1) return { error: "image_count" };
    return noteImageFromField(value[0]);
  }
  if (typeof value === "string") {
    const bytes = decodeNoteImage(value);
    if (!bytes) return { error: "image_type" };
    return acceptNoteImage(bytes);
  }
  if (value instanceof Uint8Array) return acceptNoteImage(value);
  if (isBlob(value)) {
    const bytes = new Uint8Array(await value.arrayBuffer());
    return acceptNoteImage(bytes);
  }
  return { error: "image_type" };
}

export function noteImageIsPublic(
  entry: { kind: string; visibility: string } | null,
  mediaType: string | null,
): mediaType is NoteImageMediaType {
  return (
    (entry?.kind === "note" || entry?.kind === "article" || entry?.kind === "bookmark" || entry?.kind === "page") &&
    entry.visibility === "public" &&
    noteImageMediaTypes.some((type) => type === mediaType)
  );
}
