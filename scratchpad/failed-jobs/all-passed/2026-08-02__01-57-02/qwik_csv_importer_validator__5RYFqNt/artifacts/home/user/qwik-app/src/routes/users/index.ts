import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const db = getDb();
    const users = db.prepare("SELECT id, name, email, age FROM users ORDER BY id ASC").all();
    json(200, users);
  } catch (err: any) {
    json(500, { error: err.message || "Internal Server Error" });
  }
};
