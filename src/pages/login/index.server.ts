import { defineHandler } from "void";

export const loader = defineHandler(async (c) => {
  c.header("cache-control", "private, no-store");
  c.header("vary", "Cookie");
  return {};
});
