import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, remix, vitest],
  ignorePatterns: [
    "apps/skillpack/client/components/ui/**",
    ".agents/skills/**",
    ".claude/skills/**",
  ],
  rules: {
    "sort-keys": ["error", "asc", { allowLineSeparatedGroups: true }],
  },
});
