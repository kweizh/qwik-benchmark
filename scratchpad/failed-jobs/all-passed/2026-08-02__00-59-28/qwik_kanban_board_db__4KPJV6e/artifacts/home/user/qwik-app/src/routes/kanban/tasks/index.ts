import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../db";

export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();
  const tasks = db
    .prepare(
      "SELECT id, title, column, position FROM tasks ORDER BY column, position ASC"
    )
    .all();
  json(200, tasks);
};
