import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "../../../../../lib/db";

export const onPost: RequestHandler = async (event) => {
  try {
    const id = event.params.id;
    const result = db.prepare("UPDATE tasks SET status = 'ACTIVE' WHERE id = ?").run(id);

    if (result.changes === 0) {
      event.json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    event.json(200, {
      id,
      status: "ACTIVE",
    });
  } catch (err: any) {
    event.json(500, { error: err.message });
  }
};
