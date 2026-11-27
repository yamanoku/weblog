// Turns the create form into an article. The body stays the markdown the owner typed.

import { postedDateFromField } from "./posted-date.ts";

export type ArticleVisibility = "draft" | "public";

export type EditArticleForm = {
  title: string;
  body: string;
  visibility: string;
  posted?: string;
};

export type ArticleEditForm = {
  title: string;
  body: string;
  visibility: string;
};

export type ArticleCreate =
  | {
      kind: "article" | "diary";
      title: string;
      body: string;
      visibility: ArticleVisibility;
      postedAt: string | null;
    }
  | { error: "invalid_visibility" | "empty_body" | "invalid_posted_date" };

export type ArticleUpdate =
  | { title: string; body: string; visibility: ArticleVisibility }
  | { error: "invalid_visibility" | "empty_body" };

// The create form chooses visibility. Public is the value shown first.
export function articleFromEditForm(form: EditArticleForm): ArticleCreate {
  if (form.visibility !== "draft" && form.visibility !== "public") {
    return { error: "invalid_visibility" };
  }
  if (form.visibility === "public" && form.body === "") {
    return { error: "empty_body" };
  }
  const posted = postedDateFromField(form.posted);
  if ("error" in posted) return posted;
  return {
    kind: "article",
    title: form.title,
    body: form.body,
    visibility: form.visibility,
    postedAt: "at" in posted ? posted.at : null,
  };
}

// The diary form uses the same visibility rules as an article.
export function diaryFromEditForm(form: EditArticleForm): ArticleCreate {
  const article = articleFromEditForm({ ...form, posted: undefined });
  if ("error" in article) return article;
  return { ...article, kind: "diary" };
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
