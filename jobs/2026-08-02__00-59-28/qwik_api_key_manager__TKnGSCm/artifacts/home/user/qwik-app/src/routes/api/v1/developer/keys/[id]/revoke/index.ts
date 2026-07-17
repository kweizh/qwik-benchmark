import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";

/**
 * POST /api/v1/developer/keys/:id/revoke
 * Revokes an API key by setting its status to 'revoked'.
 */
export const onPost: RequestHandler = async ({ params, json }) => {
  const idParam = params.id;
  const id = parseInt(idParam, 10);

  if (isNaN(id)) {
    json(400, { error: "Invalid key ID" });
    return;
  }

  const db = getDb();

  // Check if the key exists
  const key = db
    .prepare("SELECT id FROM api_keys WHERE id = ?")
    .get(id) as { id: number } | undefined;

  if (!key) {
    json(404, { error: "Key not found" });
    return;
  }

  db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?").run(id);

  json(200, {
    success: true,
    message: `API key '${idParam}' has been revoked successfully`,
  });
};
