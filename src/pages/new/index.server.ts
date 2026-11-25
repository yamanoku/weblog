import { defineHandler } from "void";
import { tokyoDateTitle } from "../../domain/tokyo-date.ts";

export const loader = defineHandler(async (c) => {
  const title = c.req.query("title");
  return {
    presetTitle: typeof title === "string" ? title : "",
    diaryTitle: tokyoDateTitle(),
  };
});
