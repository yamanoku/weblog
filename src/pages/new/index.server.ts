import { defineHandler } from "void";

export const loader = defineHandler(async (c) => {
  const title = c.req.query("title");
  return { presetTitle: typeof title === "string" ? title : "" };
});
