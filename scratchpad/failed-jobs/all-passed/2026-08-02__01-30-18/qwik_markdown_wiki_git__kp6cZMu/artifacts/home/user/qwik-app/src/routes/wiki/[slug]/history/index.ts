import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../../utils/db';

export const onGet: RequestHandler = async (event) => {
  const slug = event.params.slug;
  let rows: any[];
  try {
    const stmt = db.prepare('SELECT id, slug, user, timestamp, content_length FROM revisions WHERE slug = ? ORDER BY timestamp DESC');
    rows = stmt.all(slug);
  } catch (err) {
    throw event.json(500, { error: (err as Error).message });
  }
  throw event.json(200, rows);
};
