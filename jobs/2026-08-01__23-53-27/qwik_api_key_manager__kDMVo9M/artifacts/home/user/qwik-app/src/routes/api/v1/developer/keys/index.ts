import type { RequestHandler } from "@builder.io/qwik-city";
import db, { generateApiKey } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  try {
    const body = (await requestEvent.parseBody()) as any;
    const name = body?.name;

    if (!name || typeof name !== "string") {
      requestEvent.status(400);
      return requestEvent.json(400, { error: "Name is required and must be a string" });
    }

    const { fullKey, prefix, hashedKey } = generateApiKey();
    const createdAt = new Date().toISOString();
    const status = "active";

    const stmt = db.prepare(`
      INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, prefix, hashedKey, status, createdAt);
    const insertId = info.lastInsertRowid;

    requestEvent.status(201);
    return requestEvent.json(201, {
      id: Number(insertId),
      name,
      prefix,
      key: fullKey,
      status,
      created_at: createdAt,
    });
  } catch (err: any) {
    requestEvent.status(500);
    return requestEvent.json(500, { error: err.message || "Internal Server Error" });
  }
};

export const onGet: RequestHandler = async (requestEvent) => {
  try {
    const stmt = db.prepare(`
      SELECT id, name, key_prefix as prefix, status, created_at
      FROM api_keys
      ORDER BY id DESC
    `);
    const rows = stmt.all() as any[];

    const result = rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      prefix: row.prefix,
      status: row.status,
      created_at: row.created_at,
    }));

    return requestEvent.json(200, result);
  } catch (err: any) {
    requestEvent.status(500);
    return requestEvent.json(500, { error: err.message || "Internal Server Error" });
  }
};
