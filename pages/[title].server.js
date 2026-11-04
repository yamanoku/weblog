import { HTTPException } from "hono/http-exception";
import { isReservedTitle, publicEntryByTitle } from "../domain/catalog.js";
import { defineHandler } from "void";

export const loader = defineHandler((c) => {
  const title = c.req.param("title");
  if (isReservedTitle(title)) {
    throw new HTTPException(404, { message: "Not a title" });
  }
  return { entry: publicEntryByTitle(title) };
});
