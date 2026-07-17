import { type RequestHandler } from "@builder.io/qwik-city";
import { getTasks } from "../../../db";

export const onGet: RequestHandler = async (requestEvent) => {
  try {
    const tasks = getTasks();
    requestEvent.json(200, tasks);
  } catch (err: any) {
    requestEvent.json(500, { error: err.message });
  }
};
