import type { RequestHandler } from "@builder.io/qwik-city";
import { db, initRunner } from "~/lib/db";

// Ensure runner is initialized
initRunner();

export const onGet: RequestHandler = async ({ params, json }) => {
  try {
    const { id } = params;

    const history = db
      .prepare("SELECT * FROM execution_history WHERE task_id = ? ORDER BY timestamp DESC, id DESC")
      .all(id);

    json(200, history);
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
