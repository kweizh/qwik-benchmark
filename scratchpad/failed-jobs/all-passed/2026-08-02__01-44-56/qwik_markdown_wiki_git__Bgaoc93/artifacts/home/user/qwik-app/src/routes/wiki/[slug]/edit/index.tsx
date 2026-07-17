import { type RequestHandler } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import { insertRevision } from '~/lib/db';

export const onPost: RequestHandler = async (requestEvent) => {
  const { params, parseBody, redirect, json, request } = requestEvent;
  const slug = params.slug;

  // Read request body (handles JSON, urlencoded, etc.)
  let body: any = null;
  try {
    body = await parseBody();
  } catch {
    // ignore
  }

  if (!body) {
    try {
      body = await request.json();
    } catch {
      // ignore
    }
  }

  if (!body || typeof body !== 'object') {
    throw json(400, { error: 'Invalid request body' });
  }

  const content = body.content;
  const user = body.user;

  if (typeof content !== 'string' || typeof user !== 'string') {
    throw json(400, { error: 'Missing content or user field' });
  }

  // Save the markdown text to /home/user/qwik-app/wiki-pages/[slug].md
  const wikiPagesDir = '/home/user/qwik-app/wiki-pages';
  if (!fs.existsSync(wikiPagesDir)) {
    fs.mkdirSync(wikiPagesDir, { recursive: true });
  }
  const filePath = path.join(wikiPagesDir, `${slug}.md`);
  await fs.promises.writeFile(filePath, content, 'utf-8');

  // Insert a revision log entry into local SQLite database
  insertRevision(slug, user, content.length);

  // Determine response format based on Content-Type or Accept headers
  const contentType = request.headers.get('content-type') || '';
  const accept = request.headers.get('accept') || '';

  if (contentType.includes('json') || accept.includes('json')) {
    throw json(200, { success: true });
  } else {
    throw redirect(303, `/wiki/${slug}`);
  }
};
