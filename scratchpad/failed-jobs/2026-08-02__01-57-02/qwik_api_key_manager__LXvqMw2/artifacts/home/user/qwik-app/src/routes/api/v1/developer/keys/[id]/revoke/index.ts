import type { RequestHandler } from '@builder.io/qwik-city';
import db from '../../../../../../../utils/db';

export const onPost: RequestHandler = async (event) => {
  try {
    const idStr = event.params.id;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      event.json(400, { error: 'Invalid key ID' });
      return;
    }

    // Check if key exists
    const checkStmt = db.prepare('SELECT id FROM api_keys WHERE id = ?');
    const keyExists = checkStmt.get(id);

    if (!keyExists) {
      event.json(404, { error: 'Key not found' });
      return;
    }

    // Update status to revoked
    const updateStmt = db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?");
    updateStmt.run(id);

    event.json(200, {
      success: true,
      message: 'Key revoked successfully'
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
