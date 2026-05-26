import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ["tsconfig.client.json", "tsconfig.server.json"],
    }),
  ],
  test: {
    environment: "node",
    include: ["client/**/*.test.ts", "server/**/*.test.ts"],
  },
});
