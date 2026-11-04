import { entryById } from "../../domain/catalog.js";
import { defineHandler } from "void";

export const loader = defineHandler((c) => {
  return { entry: entryById(c.req.param("id")) };
});
