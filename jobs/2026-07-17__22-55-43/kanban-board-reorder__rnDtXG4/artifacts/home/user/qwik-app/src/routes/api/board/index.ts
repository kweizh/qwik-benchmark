import type { RequestHandler } from "@builder.io/qwik-city";
import { getBoard } from "~/lib/db";

export const onGet: RequestHandler = async (requestEvent) => {
  const board = getBoard();
  requestEvent.json(200, board);
};
