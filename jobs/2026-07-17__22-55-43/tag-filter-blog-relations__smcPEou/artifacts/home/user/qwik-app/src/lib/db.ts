/**
 * Server-only SQLite database access.
 *
 * IMPORTANT: This module uses `better-sqlite3`, a native Node.js addon.
 * It must never be imported from client-executed code. It is only ever
 * referenced from within `routeLoader$` / `routeAction$` callbacks, which
 * Qwik City guarantees execute exclusively on the server, so this module
 * is not bundled for the client.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const DB_PATH = join(process.cwd(), "data", "blog.sqlite");

const TAG_NAMES = ["javascript", "typescript", "qwik", "css", "performance"] as const;

const ARTICLE_SEEDS: { slug: string; title: string; tags: string[] }[] = [
  { slug: "intro-to-qwik", title: "Intro to Qwik", tags: ["javascript", "qwik"] },
  {
    slug: "typescript-basics",
    title: "TypeScript Basics",
    tags: ["javascript", "typescript"],
  },
  {
    slug: "qwik-with-typescript",
    title: "Qwik with TypeScript",
    tags: ["javascript", "typescript", "qwik"],
  },
  { slug: "css-grid-guide", title: "CSS Grid Guide", tags: ["css"] },
  {
    slug: "web-performance-tips",
    title: "Web Performance Tips",
    tags: ["javascript", "performance"],
  },
  {
    slug: "qwik-performance",
    title: "Qwik Performance",
    tags: ["qwik", "performance"],
  },
];

let dbInstance: Database.Database | null = null;

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (article_id, tag_id)
    );
  `);
}

function seed(db: Database.Database) {
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  for (const name of TAG_NAMES) {
    insertTag.run(name);
  }

  const insertArticle = db.prepare(
    "INSERT OR IGNORE INTO articles (slug, title) VALUES (?, ?)",
  );
  const getArticleId = db.prepare("SELECT id FROM articles WHERE slug = ?");
  const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
  const linkTag = db.prepare(
    "INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)",
  );

  const seedAll = db.transaction(() => {
    for (const article of ARTICLE_SEEDS) {
      insertArticle.run(article.slug, article.title);
      const articleRow = getArticleId.get(article.slug) as { id: number };
      for (const tagName of article.tags) {
        const tagRow = getTagId.get(tagName) as { id: number };
        linkTag.run(articleRow.id, tagRow.id);
      }
    }
  });

  seedAll();
}

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  createSchema(db);
  seed(db);

  dbInstance = db;
  return dbInstance;
}

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
}

export interface FacetCount {
  name: string;
  count: number;
}

/**
 * Returns articles that carry ALL of the given tag names (AND filtering).
 * With an empty `tagNames` array, all articles are returned.
 */
export function findArticlesByTags(tagNames: string[]): ArticleRow[] {
  const db = getDb();

  if (tagNames.length === 0) {
    return db
      .prepare("SELECT id, slug, title FROM articles ORDER BY id")
      .all() as ArticleRow[];
  }

  const placeholders = tagNames.map(() => "?").join(", ");
  return db
    .prepare(
      `
      SELECT a.id as id, a.slug as slug, a.title as title
      FROM articles a
      JOIN article_tags at2 ON at2.article_id = a.id
      JOIN tags t ON t.id = at2.tag_id
      WHERE t.name IN (${placeholders})
      GROUP BY a.id
      HAVING COUNT(DISTINCT t.name) = ?
      ORDER BY a.id
    `,
    )
    .all(...tagNames, tagNames.length) as ArticleRow[];
}

/** All tags, alphabetically sorted. */
export function getAllTags(): { id: number; name: string }[] {
  const db = getDb();
  return db.prepare("SELECT id, name FROM tags ORDER BY name").all() as {
    id: number;
    name: string;
  }[];
}

/**
 * Facet counts: for every tag, how many of the given article ids carry it.
 */
export function getFacetCounts(articleIds: number[]): FacetCount[] {
  const allTags = getAllTags();
  const counts = new Map<string, number>();
  for (const tag of allTags) {
    counts.set(tag.name, 0);
  }

  if (articleIds.length > 0) {
    const db = getDb();
    const placeholders = articleIds.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `
        SELECT t.name as name, COUNT(DISTINCT at2.article_id) as count
        FROM tags t
        JOIN article_tags at2 ON at2.tag_id = t.id
        WHERE at2.article_id IN (${placeholders})
        GROUP BY t.name
      `,
      )
      .all(...articleIds) as { name: string; count: number }[];

    for (const row of rows) {
      counts.set(row.name, row.count);
    }
  }

  return allTags.map((tag) => ({ name: tag.name, count: counts.get(tag.name) ?? 0 }));
}

export function getArticleBySlug(slug: string): ArticleRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT id, slug, title FROM articles WHERE slug = ?")
    .get(slug) as ArticleRow | undefined;
}

export function getTagsForArticle(articleId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT t.name as name
      FROM tags t
      JOIN article_tags at2 ON at2.tag_id = t.id
      WHERE at2.article_id = ?
      ORDER BY t.name
    `,
    )
    .all(articleId) as { name: string }[];
  return rows.map((r) => r.name);
}
