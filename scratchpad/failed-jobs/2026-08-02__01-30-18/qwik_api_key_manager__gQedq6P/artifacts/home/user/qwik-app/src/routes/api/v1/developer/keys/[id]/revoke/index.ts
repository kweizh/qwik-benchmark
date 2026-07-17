import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../../../../../lib/db';

export const onPost: RequestHandler = async ({ params, json }) => {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      json(400, { error: 'Invalid key ID' });
      return;
    }

    // Check if the key exists
    const checkStmt = db.prepare('SELECT id FROM api_keys WHERE id = ?');
    const exists = checkStmt.get(id);

    if (!exists) {
      json(404, { error: 'Key not found' });
      return;
    }

    // Update status to revoked
    const stmt = db.prepare(`
      UPDATE api_keys
      SET status = 'revoked'
      WHERE id = ?
    `);
    stmt.run(id);

    json(200, {
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error: any) {
    json(500, { error: error.message || 'Internal Server Error' });
  }
};
