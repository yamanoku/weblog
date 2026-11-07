// Turns the create form into an article. The body stays the markdown the owner typed.

export type EditArticleForm = {
  title: string;
  body: string;
};

export type ArticleFields = {
  kind: "article";
  title: string;
  body: string;
};

export function articleFromEditForm(form: EditArticleForm): ArticleFields {
  return {
    kind: "article",
    title: form.title,
    body: form.body,
  };
}
