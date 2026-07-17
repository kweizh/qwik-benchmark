import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../db";

export const onGet: RequestHandler = async ({ json }) => {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM files").all();
  json(200, rows);
};
