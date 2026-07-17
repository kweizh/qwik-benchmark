import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear any existing posts to ensure IDs are 1, 2, 3
  await prisma.post.deleteMany({});
  
  // Reset SQLite autoincrement sequence if needed (sqlite_sequence table)
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Post'`);
  } catch (e) {
    // Ignore if sqlite_sequence doesn't exist or table not found
  }

  const posts = [
    {
      title: "Welcome to Qwik",
      content: "Qwik delivers instant-loading web applications through resumability.",
    },
    {
      title: "Understanding Resumability",
      content: "Resumability lets the app pause on the server and resume on the client without hydration.",
    },
    {
      title: "Server-Side Data with routeLoader",
      content: "routeLoader fetches data on the server before rendering the route.",
    },
  ];

  for (const post of posts) {
    const created = await prisma.post.create({ data: post });
    console.log(`Created post ${created.id}: ${created.title}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
