import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "SKILLPACK_");
  const allowedHosts =
    env.SKILLPACK_DEV_ALLOWED_HOSTS?.split(",")
      .map((host) => host.trim())
      .filter(Boolean) ?? [];

  return {
    plugins: [
      tanstackRouter({
        autoCodeSplitting: true,
        generatedRouteTree: "./client/routeTree.gen.ts",
        quoteStyle: "double",
        routesDirectory: "./client/routes",
        semicolons: true,
        target: "react",
      }),
      tsconfigPaths({
        projects: ["tsconfig.client.json", "tsconfig.server.json"],
      }),
      react(),
      tailwindcss(),
      cloudflare(),
    ],
    server: {
      allowedHosts,
    },
  };
});
