import { voidSvelte } from "@void/svelte/plugin";
import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";

const outsideTheApp = [
  "docs/**",
  "packages/**",
  "bin/**",
  "AGENTS.md",
  "README.md",
  "README.ja.md",
  "sdev.toml",
];

export default defineConfig({
  plugins: [voidPlugin(), voidSvelte()],
  test: {
    include: ["src/test/**/*.test.ts"],
  },
  fmt: {
    ignorePatterns: outsideTheApp,
  },
  lint: {
    ignorePatterns: outsideTheApp,
  },
});
