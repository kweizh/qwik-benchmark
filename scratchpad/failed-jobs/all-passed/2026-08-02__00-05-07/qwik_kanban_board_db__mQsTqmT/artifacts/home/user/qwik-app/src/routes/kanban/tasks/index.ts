import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllTasks } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const tasks = getAllTasks();
  requestEvent.json(200, tasks);
};
