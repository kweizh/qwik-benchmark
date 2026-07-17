import type { RequestHandler } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import db from '../../../../utils/db';

export const onPost: RequestHandler = async (event) => {
  const slug = event.params.slug;
  const body = await event.parseBody() as any;

  let content: string | undefined;
  let user: string | undefined;

  if (body && typeof body === 'object') {
    if (typeof body.get === 'function') {
      content = body.get('content') as string;
      user = body.get('user') as string;
    } else {
      content = body.content;
      user = body.user;
    }
  }

  if (content === undefined || user === undefined) {
    throw event.json(400, { error: 'Missing content or user' });
  }

  const wikiPagesDir = '/home/user/qwik-app/wiki-pages';
  const filePath = path.join(wikiPagesDir, `${slug}.md`);

  try {
    // 1. Save markdown text
    if (!fs.existsSync(wikiPagesDir)) {
      fs.mkdirSync(wikiPagesDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');

    // 2. Insert revision log entry
    const timestamp = Date.now();
    const contentLength = content.length;

    const stmt = db.prepare(
      'INSERT INTO revisions (slug, user, timestamp, content_length) VALUES (?, ?, ?, ?)'
    );
    stmt.run(slug, user, timestamp, contentLength);

  } catch (err) {
    throw event.json(500, { error: (err as Error).message });
  }

  // 3. Redirect or return success
  const accept = event.request.headers.get('accept') || '';
  const contentType = event.request.headers.get('content-type') || '';
  if (accept.includes('application/json') || contentType.includes('application/json')) {
    throw event.json(200, { success: true });
  } else {
    throw event.redirect(303, `/wiki/${slug}`);
  }
};
