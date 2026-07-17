import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../db';

export const onGet: RequestHandler = async ({ json, error }) => {
  try {
    const stmt = db.prepare(`
      SELECT id, original_name, original_path, optimized_path, width, height
      FROM images
      ORDER BY uploaded_at DESC
    `);
    const images = stmt.all();
    json(200, images);
  } catch (err) {
    console.error('API Error:', err);
    throw error(500, 'Failed to fetch images');
  }
};
