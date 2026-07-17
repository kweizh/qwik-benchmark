import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../lib/db.server';

export const onGet: RequestHandler = async ({ url, json }) => {
  const q = url.searchParams.get('q');

  if (q === null || q === '') {
    json(200, []);
    return;
  }

  try {
    const stmt = db.prepare(`
      SELECT title, snippet(articles_fts, 1, '<b>', '</b>', '...', 10) as snippet
      FROM articles_fts
      WHERE articles_fts MATCH ?
    `);
    const results = stmt.all(q) as { title: string; snippet: string }[];
    json(200, results);
  } catch (error) {
    json(400, { error: 'Invalid search query syntax' });
  }
};
