import { defineHandler } from "void";
import {
  editArticleDatabase,
  listArticlesForEdit,
  submitArticleFromEdit,
} from "../../store/edit-article.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const loader = defineHandler(async () => {
  return { articles: await listArticlesForEdit(editArticleDatabase()) };
});

export const action = defineHandler(async (c) => {
  const posted = await c.req.parseBody();
  await submitArticleFromEdit(editArticleDatabase(), {
    title: postedText(posted.title),
    body: postedText(posted.body),
  });
});
