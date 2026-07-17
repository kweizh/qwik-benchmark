import type { RequestHandler } from '@builder.io/qwik-city';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import db from '../../../db';

export const onPost: RequestHandler = async (event) => {
  try {
    const formData = await event.request.formData();
    const file = formData.get('file');
    const tag = formData.get('tag');

    // Validation
    if (!file || !(file instanceof Blob)) {
      event.json(400, { error: 'Missing or invalid file' });
      return;
    }

    // A file is considered invalid if it has no name or size is 0
    const name = (file as any).name;
    if (!name || file.size === 0) {
      event.json(400, { error: 'Invalid file name or empty file' });
      return;
    }

    if (!tag || typeof tag !== 'string' || tag.trim() === '') {
      event.json(400, { error: 'Missing or invalid tag' });
      return;
    }

    // Ensure uploads directory exists
    const uploadDir = '/home/user/qwik-app/public/uploads';
    mkdirSync(uploadDir, { recursive: true });

    // Save the file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadPath = join(uploadDir, name);
    await writeFile(uploadPath, buffer);

    // Save metadata to SQLite database
    const mime = file.type || 'application/octet-stream';
    const size = file.size;
    const finalTag = tag.trim();

    const stmt = db.prepare('INSERT INTO files (name, size, mime, tag) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, size, mime, finalTag);
    const id = Number(info.lastInsertRowid);

    // Return 201 Created with the JSON representation of the new record
    event.json(201, {
      id,
      name,
      size,
      mime,
      tag: finalTag,
    });
  } catch (err: any) {
    event.json(400, { error: err.message || 'An error occurred during upload' });
  }
};
