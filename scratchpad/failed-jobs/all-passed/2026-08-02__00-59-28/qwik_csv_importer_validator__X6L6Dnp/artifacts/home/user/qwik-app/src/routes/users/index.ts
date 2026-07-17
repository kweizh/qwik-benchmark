import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/database";

export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();

  try {
    const users = db.prepare("SELECT id, name, email, age FROM users ORDER BY id ASC").all();
    json(200, users);
  } catch (err) {
    console.error("Users fetch error:", err);
    json(200, []);
  }
};
