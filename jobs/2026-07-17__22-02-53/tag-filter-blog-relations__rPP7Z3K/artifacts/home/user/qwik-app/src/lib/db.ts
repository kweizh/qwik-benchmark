import Database from 'better-sqlite3';

let dbInstance: Database.Database | null = null;

export interface Article {
  id: number;
  slug: string;
  title: string;
}

export interface TagFacet {
  name: string;
  count: number;
}

export interface ArticleDetail {
  id: number;
  slug: string;
  title: string;
  tags: string[];
}

export function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = '/home/user/qwik-app/db.sqlite';
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
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
      article_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (article_id, tag_id),
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Seed tags
  const tags = ['javascript', 'typescript', 'qwik', 'css', 'performance'];
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  for (const tag of tags) {
    insertTag.run(tag);
  }

  // Seed articles and their tags
  const seedArticles = [
    { slug: 'intro-to-qwik', title: 'Intro to Qwik', tags: ['javascript', 'qwik'] },
    { slug: 'typescript-basics', title: 'TypeScript Basics', tags: ['javascript', 'typescript'] },
    { slug: 'qwik-with-typescript', title: 'Qwik with TypeScript', tags: ['javascript', 'typescript', 'qwik'] },
    { slug: 'css-grid-guide', title: 'CSS Grid Guide', tags: ['css'] },
    { slug: 'web-performance-tips', title: 'Web Performance Tips', tags: ['javascript', 'performance'] },
    { slug: 'qwik-performance', title: 'Qwik Performance', tags: ['qwik', 'performance'] }
  ];

  const insertArticle = db.prepare('INSERT OR IGNORE INTO articles (slug, title) VALUES (?, ?)');
  const getArticleId = db.prepare('SELECT id FROM articles WHERE slug = ?');
  const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertArticleTag = db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)');

  for (const art of seedArticles) {
    insertArticle.run(art.slug, art.title);
    
    const artRow = getArticleId.get(art.slug) as { id: number } | undefined;
    if (artRow) {
      for (const tName of art.tags) {
        const tagRow = getTagId.get(tName) as { id: number } | undefined;
        if (tagRow) {
          insertArticleTag.run(artRow.id, tagRow.id);
        }
      }
    }
  }

  dbInstance = db;
  return db;
}

export function getFilteredArticlesAndFacets(selectedTags: string[]) {
  const db = getDb();
  
  let articles: Article[] = [];
  if (selectedTags.length === 0) {
    articles = db.prepare('SELECT id, slug, title FROM articles').all() as Article[];
  } else {
    const placeholders = selectedTags.map(() => '?').join(',');
    const query = `
      SELECT a.id, a.slug, a.title
      FROM articles a
      JOIN article_tags at ON a.id = at.article_id
      JOIN tags t ON at.tag_id = t.id
      WHERE t.name IN (${placeholders})
      GROUP BY a.id
      HAVING COUNT(DISTINCT t.name) = ?
    `;
    articles = db.prepare(query).all(...selectedTags, selectedTags.length) as Article[];
  }

  const articleIds = articles.map(a => a.id);
  let facets: TagFacet[] = [];
  if (articleIds.length === 0) {
    facets = db.prepare(`
      SELECT name, 0 as count
      FROM tags
    `).all() as TagFacet[];
  } else {
    const placeholders = articleIds.map(() => '?').join(',');
    const query = `
      SELECT t.name, COUNT(at.article_id) as count
      FROM tags t
      LEFT JOIN article_tags at ON t.id = at.tag_id AND at.article_id IN (${placeholders})
      GROUP BY t.id
    `;
    facets = db.prepare(query).all(...articleIds) as TagFacet[];
  }

  // Ensure count is a number (better-sqlite3 returns number or bigint depending on configuration)
  const formattedFacets = facets.map(f => ({
    name: f.name,
    count: Number(f.count)
  }));

  return {
    articles,
    facets: formattedFacets
  };
}

export function getArticleBySlug(slug: string): ArticleDetail | null {
  const db = getDb();
  const article = db.prepare('SELECT id, slug, title FROM articles WHERE slug = ?').get(slug) as Article | undefined;
  if (!article) {
    return null;
  }
  const tags = db.prepare(`
    SELECT t.name
    FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    WHERE at.article_id = ?
  `).all(article.id) as { name: string }[];

  return {
    ...article,
    tags: tags.map(t => t.name)
  };
}
