import type { RequestHandler } from "@builder.io/qwik-city";
import db from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  try {
    const id = requestEvent.params.id;

    // Check if the key exists
    const checkStmt = db.prepare("SELECT id FROM api_keys WHERE id = ?");
    const keyExists = checkStmt.get(id);

    if (!keyExists) {
      requestEvent.status(404);
      return requestEvent.json(404, { error: "Key not found" });
    }

    // Update status to 'revoked'
    const updateStmt = db.prepare("UPDATE api_keys SET status = 'revoked' WHERE id = ?");
    updateStmt.run(id);

    return requestEvent.json(200, {
      success: true,
      message: "API key has been successfully revoked",
    });
  } catch (err: any) {
    requestEvent.status(500);
    return requestEvent.json(500, { error: err.message || "Internal Server Error" });
  }
};
