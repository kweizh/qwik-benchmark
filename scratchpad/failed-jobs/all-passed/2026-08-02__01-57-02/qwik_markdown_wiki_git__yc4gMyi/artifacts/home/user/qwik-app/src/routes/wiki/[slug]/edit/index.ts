import { type RequestHandler } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import { db } from '../../../../lib/db';

export const onPost: RequestHandler = async ({ params, parseBody, redirect, json, request }) => {
  const slug = params.slug;
  const body = await parseBody() as any;
  
  const content = body?.content ?? '';
  const user = body?.user ?? '';

  // 1. Save the markdown text to /home/user/qwik-app/wiki-pages/[slug].md
  const pagesDir = '/home/user/qwik-app/wiki-pages';
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  const filePath = path.join(pagesDir, `${slug}.md`);
  await fs.promises.writeFile(filePath, content, 'utf-8');

  // 2. Insert a revision log entry into local SQLite database
  const timestamp = Date.now();
  const contentLength = content.length;

  const stmt = db.prepare(`
    INSERT INTO revisions (slug, user, timestamp, content_length)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(slug, user, timestamp, contentLength);

  // 3. Redirect or return JSON
  const contentType = request.headers.get('content-type') || '';
  const accept = request.headers.get('accept') || '';
  if (contentType.includes('application/json') || accept.includes('application/json')) {
    throw json(200, { success: true });
  }

  throw redirect(303, `/wiki/${slug}`);
};
