import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllUsers } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const users = getAllUsers();
  requestEvent.json(200, users);
};
