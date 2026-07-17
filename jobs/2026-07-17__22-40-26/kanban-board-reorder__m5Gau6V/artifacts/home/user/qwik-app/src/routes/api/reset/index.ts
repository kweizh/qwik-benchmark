import type { RequestHandler } from "@builder.io/qwik-city";
import { resetBoard } from "~/lib/db";

export const onPost: RequestHandler = async ({ json, status }) => {
  const board = resetBoard();
  status(200);
  json(200, board);
};
