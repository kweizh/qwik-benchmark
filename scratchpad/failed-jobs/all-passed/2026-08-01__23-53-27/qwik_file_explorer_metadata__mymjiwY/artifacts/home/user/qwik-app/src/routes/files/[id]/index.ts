import type { RequestHandler } from '@builder.io/qwik-city';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';
import db from '../../../db';

export const onDelete: RequestHandler = async (event) => {
  try {
    const idStr = event.params.id;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      event.json(400, { error: 'Invalid ID format' });
      return;
    }

    // Query database for the file record
    const stmt = db.prepare('SELECT id, name FROM files WHERE id = ?');
    const fileRecord = stmt.get(id) as { id: number; name: string } | undefined;

    if (!fileRecord) {
      event.json(404, { error: 'File not found' });
      return;
    }

    // Attempt to delete physical file if it exists
    const uploadDir = '/home/user/qwik-app/public/uploads';
    const filePath = join(uploadDir, fileRecord.name);

    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (fsErr) {
      // Log error or ignore as per instructions: "it must still delete the database record and return 200 OK"
      console.error(`Failed to delete physical file: ${filePath}`, fsErr);
    }

    // Delete database record
    const deleteStmt = db.prepare('DELETE FROM files WHERE id = ?');
    deleteStmt.run(id);

    event.json(200, { success: true });
  } catch (err: any) {
    event.json(500, { error: err.message || 'An error occurred during deletion' });
  }
};
