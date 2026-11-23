// The page edit form replaces title and body. Kind and visibility stay as stored.

export type PageEditForm = {
  title: string;
  body: string;
};

export type PageUpdate =
  | { title: string; body: string }
  | { error: "missing_title" | "empty_body" };

// An empty title or an empty body is refused. Whitespace in the body is stored.
export function pageUpdateFromEditForm(form: PageEditForm): PageUpdate {
  if (form.title.trim() === "") return { error: "missing_title" };
  if (form.body === "") return { error: "empty_body" };
  return { title: form.title, body: form.body };
}
