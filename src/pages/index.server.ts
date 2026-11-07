import { deliverableEntries } from "../domain/catalog.ts";
import { defineHandler } from "void";

export const loader = defineHandler(() => {
  return { entries: deliverableEntries() };
});
