import type { RequestHandler } from "@builder.io/qwik-city";
import { db } from "~/lib/db";

export const onPost: RequestHandler = async ({ params, json }) => {
  const { id } = params;
  try {
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!task) {
      json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    db.prepare("UPDATE tasks SET status = 'ACTIVE' WHERE id = ?").run(id);

    json(200, {
      id,
      status: "ACTIVE",
    });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
