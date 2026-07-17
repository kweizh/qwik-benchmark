import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/db";
import { generateApiKey, getKeyPrefix, hashKey } from "~/lib/crypto";

/**
 * POST /api/v1/developer/keys
 * Generates a new API key.
 */
export const onPost: RequestHandler = async ({ request, json }) => {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    json(400, { error: "Invalid JSON body" });
    return;
  }

  const name = body.name?.trim();
  if (!name) {
    json(400, { error: "The 'name' field is required" });
    return;
  }

  const plainKey = generateApiKey();
  const prefix = getKeyPrefix(plainKey);
  const hashed = hashKey(plainKey);
  const createdAt = new Date().toISOString();

  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  );
  const result = stmt.run(name, prefix, hashed, createdAt);

  json(201, {
    id: result.lastInsertRowid as number,
    name,
    prefix,
    key: plainKey,
    status: "active",
    created_at: createdAt,
  });
};

/**
 * GET /api/v1/developer/keys
 * Lists all generated API keys (without the plain text key or hash).
 */
export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, key_prefix, status, created_at FROM api_keys ORDER BY id DESC")
    .all() as Array<{
    id: number;
    name: string;
    key_prefix: string;
    status: string;
    created_at: string;
  }>;

  const result = rows.map((row) => ({
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    status: row.status,
    created_at: row.created_at,
  }));

  json(200, result);
};
