import { deliverableEntries } from "../domain/catalog.js";
import { defineHandler } from "void";

export const loader = defineHandler(() => {
  return { entries: deliverableEntries() };
});
