import { publicEntries } from "../domain/catalog.js";
import { defineHandler } from "void";

export const loader = defineHandler(() => {
  return { entries: publicEntries() };
});
