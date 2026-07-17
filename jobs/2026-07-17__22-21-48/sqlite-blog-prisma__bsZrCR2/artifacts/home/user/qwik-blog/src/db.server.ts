/**
 * Server-only database module.
 *
 * This file MUST never be imported from client-reachable code. It is only
 * imported from `routeLoader$`, `routeAction$` and `server$` callbacks, which
 * Qwik guarantees run exclusively on the server and are stripped from the
 * client build.
 *
 * The `.server.ts` extension is a convention that helps tooling recognize this
 * boundary, but the real protection comes from only using it inside server
 * functions.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Resolve the SQLite file location.
 *
 * The Prisma default `DATABASE_URL="file:./dev.db"` resolves to
 * `prisma/dev.db` (relative to the project's `prisma/` directory), matching
 * the Prisma CLI behavior configured in `prisma.config.ts`.
 */
function resolveDbFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const relativePath = url.replace(/^file:/, "");
  return path.resolve(process.cwd(), "prisma", relativePath);
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: `file:${resolveDbFile()}`,
  });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot-reloads in dev to avoid exhausting
// SQLite connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}