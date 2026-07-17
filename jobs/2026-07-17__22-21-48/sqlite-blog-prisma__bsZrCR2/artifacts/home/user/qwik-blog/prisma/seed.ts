/**
 * Seed script. Run with: `prisma db seed` (configured in prisma.config.ts).
 */
import path from "node:path";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function resolveDbFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const relativePath = url.replace(/^file:/, "");
  return path.resolve(process.cwd(), "prisma", relativePath);
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: `file:${resolveDbFile()}` }),
});

const posts = [
  {
    title: "Welcome to Qwik",
    content:
      "Qwik delivers instant-loading web applications through resumability.",
  },
  {
    title: "Understanding Resumability",
    content:
      "Resumability lets the app pause on the server and resume on the client without hydration.",
  },
  {
    title: "Server-Side Data with routeLoader",
    content:
      "routeLoader fetches data on the server before rendering the route.",
  },
];

async function main() {
  // Reset so seeding is idempotent and ids stay 1, 2, 3.
  await prisma.post.deleteMany();

  for (const post of posts) {
    await prisma.post.create({ data: post });
  }

  const all = await prisma.post.findMany({ orderBy: { id: "asc" } });
  console.log("Seeded posts:", all);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });