import type { RequestHandler } from "@builder.io/qwik-city";
import { triggerTask } from "~/lib/runner";

export const onPost: RequestHandler = async ({ params, json }) => {
  const { id } = params;
  try {
    const success = triggerTask(id);
    if (!success) {
      json(404, { error: `Task with id '${id}' not found` });
      return;
    }

    json(200, {
      id,
      triggered: true,
    });
  } catch (err: any) {
    json(500, { error: err.message });
  }
};
