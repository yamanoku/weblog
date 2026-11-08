// Turns the create form into an article. The body stays the markdown the owner typed.

export type EditArticleForm = {
  title: string;
  body: string;
};

export type ArticleVisibility = "draft" | "public";

export type ArticleEditForm = {
  title: string;
  body: string;
  visibility: string;
};

export type ArticleFields = {
  kind: "article";
  title: string;
  body: string;
};

export type ArticleUpdate =
  | { title: string; body: string; visibility: ArticleVisibility }
  | { error: "invalid_visibility" | "empty_body" };

export function articleFromEditForm(form: EditArticleForm): ArticleFields {
  return {
    kind: "article",
    title: form.title,
    body: form.body,
  };
}

// The article edit form changes title, body, and visibility. Kind stays article.
export function articleUpdateFromEditForm(form: ArticleEditForm): ArticleUpdate {
  if (form.visibility !== "draft" && form.visibility !== "public") {
    return { error: "invalid_visibility" };
  }
  if (form.visibility === "public" && form.body === "") {
    return { error: "empty_body" };
  }
  return {
    title: form.title,
    body: form.body,
    visibility: form.visibility,
  };
}

// Fields for a stored public article. A draft or another kind returns null.
export function publicArticleFields(
  entry: { kind: string; visibility: string; title: string; body: string } | null,
): { title: string; body: string } | null {
  if (!entry || entry.kind !== "article" || entry.visibility !== "public") return null;
  return { title: entry.title, body: entry.body };
}
