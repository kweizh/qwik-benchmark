import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

const seedPosts = [
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
  const count = await prisma.post.count();
  if (count > 0) {
    console.log(`Database already has ${count} post(s), skipping seed.`);
    return;
  }

  for (const post of seedPosts) {
    const created = await prisma.post.create({ data: post });
    console.log(`Created post #${created.id}: ${created.title}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
