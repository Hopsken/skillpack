import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "apps/skillpack/client/components/ui/**",
    ".agents/skills/**",
    ".claude/skills/**",
    "dist/**",
  ],
});
