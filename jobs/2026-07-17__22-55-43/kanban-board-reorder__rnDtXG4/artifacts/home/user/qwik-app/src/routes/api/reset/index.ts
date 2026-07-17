import type { RequestHandler } from "@builder.io/qwik-city";
import { resetBoard } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  const board = resetBoard();
  requestEvent.json(200, board);
};
