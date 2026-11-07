import { publicEntries } from "../domain/catalog.ts";
import { defineHandler } from "void";

export const loader = defineHandler(() => {
  return { entries: publicEntries() };
});
