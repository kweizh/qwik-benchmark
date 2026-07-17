import { type RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../../lib/db';

export const onGet: RequestHandler = async ({ params, json }) => {
  const slug = params.slug;

  const stmt = db.prepare(`
    SELECT id, slug, user, timestamp, content_length
    FROM revisions
    WHERE slug = ?
    ORDER BY timestamp DESC
  `);
  const rows = stmt.all(slug);

  const revisions = rows.map((row: any) => ({
    id: Number(row.id),
    slug: String(row.slug),
    user: String(row.user),
    timestamp: Number(row.timestamp),
    content_length: Number(row.content_length),
  }));

  throw json(200, revisions);
};
