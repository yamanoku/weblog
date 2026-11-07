import { defineHandler } from "void";
import { editArticleDatabase, submitArticleFromEdit } from "../../store/edit-article.ts";

function postedText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export const loader = defineHandler(() => {
  return {};
});

export const action = defineHandler(async (c) => {
  const posted = await c.req.parseBody();
  await submitArticleFromEdit(editArticleDatabase(), {
    title: postedText(posted.title),
    body: postedText(posted.body),
  });
});
