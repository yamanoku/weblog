// The bookmark form stores an external URL apart from the comment body.

export type BookmarkCreateForm = {
  title: string;
  body: string;
  bookmarkUrl: string;
};

export type BookmarkEditForm = {
  title: string;
  body: string;
  bookmarkUrl: string;
  visibility: string;
};

export type BookmarkVisibility = "draft" | "public";

export type BookmarkFields = {
  title: string;
  body: string;
  bookmarkUrl: string;
};

export type BookmarkUpdate =
  | {
      title: string;
      body: string;
      bookmarkUrl: string;
      visibility: BookmarkVisibility;
    }
  | { error: "missing_title" | "missing_bookmark_url" | "invalid_visibility" | "empty_body" };

function presentTitle(title: string): boolean {
  return title.trim() !== "";
}

function presentUrl(url: string): string | null {
  const trimmed = url.trim();
  return trimmed === "" ? null : trimmed;
}

export function bookmarkFromEditForm(
  form: BookmarkCreateForm,
): BookmarkFields | { error: "missing_title" | "missing_bookmark_url" } {
  if (!presentTitle(form.title)) return { error: "missing_title" };
  const bookmarkUrl = presentUrl(form.bookmarkUrl);
  if (!bookmarkUrl) return { error: "missing_bookmark_url" };
  return { title: form.title, body: form.body, bookmarkUrl };
}

export function bookmarkUpdateFromEditForm(form: BookmarkEditForm): BookmarkUpdate {
  if (form.visibility !== "draft" && form.visibility !== "public") {
    return { error: "invalid_visibility" };
  }
  if (!presentTitle(form.title)) return { error: "missing_title" };
  const bookmarkUrl = presentUrl(form.bookmarkUrl);
  if (!bookmarkUrl) return { error: "missing_bookmark_url" };
  if (form.visibility === "public" && form.body === "") return { error: "empty_body" };
  return {
    title: form.title,
    body: form.body,
    bookmarkUrl,
    visibility: form.visibility,
  };
}

export function bookmarkDeleteId(value: unknown): { id: string } | { error: "not_found" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "not_found" };
  const id = (value as { bookmarkId?: unknown }).bookmarkId;
  if (typeof id !== "string" || id === "") return { error: "not_found" };
  return { id };
}
