import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '../../../lib/db';
import fs from 'fs';
import path from 'path';

export const onDelete: RequestHandler = async ({ params, json }) => {
  try {
    const idStr = params.id;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      json(400, { error: 'Invalid ID format' });
      return;
    }

    // Check if the record exists in SQLite
    const row = db.prepare('SELECT name FROM files WHERE id = ?').get(id) as { name: string } | undefined;
    if (!row) {
      json(404, { error: 'File ID does not exist in the database' });
      return;
    }

    // Try to delete physical file from disk
    const uploadDir = '/home/user/qwik-app/public/uploads';
    const filePath = path.join(uploadDir, row.name);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // If physical file is missing or cannot be deleted, we still proceed to delete db record.
    }

    // Delete corresponding metadata record from SQLite database
    db.prepare('DELETE FROM files WHERE id = ?').run(id);

    json(200, { success: true });
  } catch (error: any) {
    json(500, { error: error.message || 'An error occurred during deletion' });
  }
};
