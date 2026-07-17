// Server-only database access module.
//
// IMPORTANT: This file must only ever be imported from server-only code
// paths such as `routeLoader$`, `routeAction$` or `server$` callbacks.
// It is never imported from top-level component code, so the Qwik
// optimizer will keep it (and Prisma/better-sqlite3) out of the client
// bundle entirely.
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

let _prisma: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!_prisma) {
    const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
    const adapter = new PrismaBetterSqlite3({ url });
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

export type { PostModel } from "../generated/prisma/models";
