import { entryById } from "../../domain/catalog.ts";
import { defineHandler } from "void";

export const loader = defineHandler((c) => {
  return { entry: entryById(c.req.param("id") ?? "") };
});
