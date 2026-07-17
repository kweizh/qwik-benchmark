import { type RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../lib/db";

export const onGet: RequestHandler = async ({ json }) => {
  try {
    const db = await getDb();
    const users = await db.all("SELECT id, name, email, age FROM users ORDER BY id ASC");
    json(200, users);
  } catch (error: any) {
    json(500, { error: error?.message || "Internal Server Error" });
  }
};
