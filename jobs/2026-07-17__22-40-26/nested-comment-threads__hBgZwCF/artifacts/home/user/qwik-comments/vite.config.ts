import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    plugins: [qwikCity(), qwikVite(), tsconfigPaths()],
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
    optimizeDeps: {
      exclude: ["better-sqlite3"],
    },
    ssr: {
      external: ["better-sqlite3"],
    },
  };
});