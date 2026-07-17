/**
 * Server-only SQLite module. This file uses `node:` imports and must never
 * be imported from a client component. The route loaders in `src/routes/`
 * are the only places that import from here.
 */
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const DB_DIR = resolve(process.cwd(), 'data');
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = resolve(DB_DIR, 'blog.db');

let dbInstance: Database.Database | null = null;
let initialized = false;

export interface ArticleRow {
  id: number;
  slug: string;
  title: string;
}

export interface TagRow {
  id: number;
  name: string;
}

export interface ArticleListItem {
  slug: string;
  title: string;
  tags: string[];
}

export interface FacetRow {
  name: string;
  count: number;
}

export interface ArticleDetail {
  slug: string;
  title: string;
  tags: string[];
}

function initSchema(db: Database.Database): void {
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

function seed(db: Database.Database): void {
  const tagNames = ['javascript', 'typescript', 'qwik', 'css', 'performance'];
  const articleSeeds: Array<{ slug: string; title: string; tags: string[] }> = [
    { slug: 'intro-to-qwik', title: 'Intro to Qwik', tags: ['javascript', 'qwik'] },
    {
      slug: 'typescript-basics',
      title: 'TypeScript Basics',
      tags: ['javascript', 'typescript'],
    },
    {
      slug: 'qwik-with-typescript',
      title: 'Qwik with TypeScript',
      tags: ['javascript', 'typescript', 'qwik'],
    },
    { slug: 'css-grid-guide', title: 'CSS Grid Guide', tags: ['css'] },
    {
      slug: 'web-performance-tips',
      title: 'Web Performance Tips',
      tags: ['javascript', 'performance'],
    },
    {
      slug: 'qwik-performance',
      title: 'Qwik Performance',
      tags: ['qwik', 'performance'],
    },
  ];

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertArticle = db.prepare(
    'INSERT OR IGNORE INTO articles (slug, title) VALUES (?, ?)'
  );
  const findArticle = db.prepare('SELECT id FROM articles WHERE slug = ?');
  const insertJoin = db.prepare(
    'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)'
  );

  const tx = db.transaction(() => {
    for (const name of tagNames) {
      insertTag.run(name);
    }
    for (const a of articleSeeds) {
      insertArticle.run(a.slug, a.title);
      for (const tagName of a.tags) {
        const tag = findTag.get(tagName) as { id: number } | undefined;
        const article = findArticle.get(a.slug) as { id: number } | undefined;
        if (tag && article) {
          insertJoin.run(article.id, tag.id);
        }
      }
    }
  });
  tx();
}

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
  }
  if (!initialized) {
    initSchema(dbInstance);
    seed(dbInstance);
    initialized = true;
  }
  return dbInstance;
}

export function listArticlesFiltered(selectedTags: string[]): ArticleListItem[] {
  const db = getDb();
  const stmt =
    selectedTags.length === 0
      ? db.prepare(
          `SELECT a.id AS id, a.slug AS slug, a.title AS title
           FROM articles a
           ORDER BY a.id`
        )
      : db.prepare(
          `SELECT a.id AS id, a.slug AS slug, a.title AS title
           FROM articles a
           JOIN article_tags at ON at.article_id = a.id
           JOIN tags t ON t.id = at.tag_id
           WHERE t.name IN (${selectedTags.map(() => '?').join(',')})
           GROUP BY a.id, a.slug, a.title
           HAVING COUNT(DISTINCT t.name) = ?
           ORDER BY a.id`
        );

  const rows =
    selectedTags.length === 0
      ? (stmt.all() as Array<{ id: number; slug: string; title: string }>)
      : (stmt.all(...selectedTags, selectedTags.length) as Array<{
          id: number;
          slug: string;
          title: string;
        }>);

  const tagStmt = db.prepare(
    `SELECT t.name AS name
     FROM tags t
     JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = ?
     ORDER BY t.name`
  );

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    tags: (tagStmt.all(row.id) as Array<{ name: string }>).map((r) => r.name),
  }));
}

export function listFacets(selectedTags: string[]): FacetRow[] {
  const db = getDb();
  if (selectedTags.length === 0) {
    const stmt = db.prepare(
      `SELECT t.name AS name, COUNT(DISTINCT at.article_id) AS count
       FROM tags t
       LEFT JOIN article_tags at ON at.tag_id = t.id
       GROUP BY t.id, t.name
       ORDER BY t.name`
    );
    return stmt.all() as FacetRow[];
  }
  const placeholders = selectedTags.map(() => '?').join(',');
  const stmt = db.prepare(
    `WITH filtered AS (
       SELECT a.id AS id
       FROM articles a
       JOIN article_tags at ON at.article_id = a.id
       JOIN tags t ON t.id = at.tag_id
       WHERE t.name IN (${placeholders})
       GROUP BY a.id
       HAVING COUNT(DISTINCT t.name) = ?
     )
     SELECT t.name AS name, COUNT(DISTINCT fa.id) AS count
     FROM tags t
     LEFT JOIN article_tags at ON at.tag_id = t.id
     LEFT JOIN filtered fa ON fa.id = at.article_id
     GROUP BY t.id, t.name
     ORDER BY t.name`
  );
  return stmt.all(...selectedTags, selectedTags.length) as FacetRow[];
}

export function findArticleBySlug(slug: string): ArticleDetail | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, slug, title FROM articles WHERE slug = ?')
    .get(slug) as { id: number; slug: string; title: string } | undefined;
  if (!row) return null;
  const tags = (
    db
      .prepare(
        `SELECT t.name AS name
         FROM tags t
         JOIN article_tags at ON at.tag_id = t.id
         WHERE at.article_id = ?
         ORDER BY t.name`
      )
      .all(row.id) as Array<{ name: string }>
  ).map((r) => r.name);
  return { slug: row.slug, title: row.title, tags };
}