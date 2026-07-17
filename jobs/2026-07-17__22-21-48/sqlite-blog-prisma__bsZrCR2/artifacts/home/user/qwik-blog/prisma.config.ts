import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Resolve the SQLite file location.
 *
 * The Prisma default `DATABASE_URL="file:./dev.db"` historically resolved
 * relative to the Prisma schema directory (`prisma/`), producing
 * `prisma/dev.db`. In Prisma ORM v7 the connection URL is resolved relative to
 * the current working directory instead, so we normalize it back to an
 * absolute path under `prisma/` to keep the database file in the expected
 * location regardless of where the CLI is invoked from.
 */
function resolveDbFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const relativePath = url.replace(/^file:/, "");
  return path.resolve(process.cwd(), "prisma", relativePath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --experimental-strip-types prisma/seed.ts",
  },
  datasource: {
    url: `file:${resolveDbFile()}`,
  },
});