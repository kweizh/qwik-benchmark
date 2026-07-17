import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../lib/db.server';

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  let body: any;
  try {
    body = await parseBody();
  } catch (e) {
    json(400, { error: 'Title and content are required' });
    return;
  }

  if (
    !body ||
    typeof body !== 'object' ||
    typeof body.title !== 'string' ||
    typeof body.content !== 'string' ||
    body.title.trim() === '' ||
    body.content.trim() === ''
  ) {
    json(400, { error: 'Title and content are required' });
    return;
  }

  const { title, content } = body;

  try {
    const stmt = db.prepare('INSERT INTO articles_fts (title, content) VALUES (?, ?)');
    const info = stmt.run(title, content);
    
    json(201, {
      rowid: Number(info.lastInsertRowid),
      title,
      content,
    });
  } catch (error) {
    json(500, { error: 'Failed to create article' });
  }
};
