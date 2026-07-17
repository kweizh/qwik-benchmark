import { defineConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";

export default defineConfig(() => {
  return {
    plugins: [qwikCity(), qwikVite()],
    ssr: {
      external: ["better-sqlite3"],
    },
    server: {
      fs: {
        allow: ["."],
      },
    },
  };
});