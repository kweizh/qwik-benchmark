import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";
import { hashKey } from "~/lib/crypto";

/**
 * GET /api/v1/hello
 * Authenticated endpoint that requires a valid and active API key in the X-API-Key header.
 */
export const onGet: RequestHandler = async ({ request, json }) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    json(401, { error: "Unauthorized" });
    return;
  }

  const hashed = hashKey(apiKey);
  const db = getDb();

  const row = db
    .prepare("SELECT id FROM api_keys WHERE hashed_key = ? AND status = 'active'")
    .get(hashed) as { id: number } | undefined;

  if (!row) {
    json(401, { error: "Unauthorized" });
    return;
  }

  json(200, {
    message: "Hello, authenticated developer!",
  });
};
