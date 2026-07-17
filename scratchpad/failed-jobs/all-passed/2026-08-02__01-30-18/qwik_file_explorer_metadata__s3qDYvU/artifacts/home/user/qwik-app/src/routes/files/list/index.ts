import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../lib/db";

export const onGet: RequestHandler = async (ev) => {
  try {
    const stmt = db.prepare("SELECT id, name, size, mime, tag FROM files");
    const files = stmt.all();
    ev.json(200, files);
  } catch (error: any) {
    ev.json(500, { error: error.message || "An error occurred while listing files" });
  }
};
