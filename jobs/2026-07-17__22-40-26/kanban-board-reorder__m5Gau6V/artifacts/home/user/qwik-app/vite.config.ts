import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  return {
    plugins: [qwikCity(), qwikVite(), tsconfigPaths()],
    optimizeDeps: {
      exclude: ["better-sqlite3"],
    },
    ssr: {
      // better-sqlite3 is a native module and must not be bundled by Vite for SSR
      external: ["better-sqlite3"],
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
    preview: {
      headers: {
        "Cache-Control": "public, max-age=600",
      },
    },
  };
});
