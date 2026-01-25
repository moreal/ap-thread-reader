import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { lingui } from "@lingui/vite-plugin";
import { resolve } from "path";

export default defineConfig({
  server: {
    port: 3000,
  },

  // Plugin order matters - tanstackStart MUST come BEFORE viteReact
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    viteReact({
      babel: {
        plugins: ["@lingui/babel-plugin-lingui-macro"],
      },
    }),
    lingui(),
  ],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },

  // CRITICAL: Fix AsyncLocalStorage error
  optimizeDeps: {
    exclude: ["@tanstack/start-storage-context", "node:async_hooks"],
  },

  ssr: {
    // Bundle @tanstack/start in SSR to maintain context
    noExternal: ["@tanstack/start"],
    // Externalize Node.js APIs from browser
    external: ["node:async_hooks"],
  },

  build: {
    outDir: "dist",
    target: "esnext",
  },
});
