import { voidSvelte } from "@void/svelte/plugin";
import { defineConfig } from "vite";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin(), voidSvelte()],
});
