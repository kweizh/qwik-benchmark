import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const tag = formData.get('tag');

    if (!file || typeof file === 'string' || !file.name) {
      json(400, { error: 'File is missing or invalid' });
      return;
    }

    if (!tag || typeof tag !== 'string' || tag.trim() === '') {
      json(400, { error: 'Tag is missing or invalid' });
      return;
    }

    const uploadDir = '/home/user/qwik-app/public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const size = file.size;
    const mime = file.type || 'application/octet-stream';
    const name = file.name;

    const stmt = db.prepare(
      'INSERT INTO files (name, size, mime, tag) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, size, mime, tag);
    const id = Number(result.lastInsertRowid);

    json(201, {
      id,
      name,
      size,
      mime,
      tag,
    });
  } catch (error: any) {
    json(400, { error: error.message || 'An error occurred during upload' });
  }
};
