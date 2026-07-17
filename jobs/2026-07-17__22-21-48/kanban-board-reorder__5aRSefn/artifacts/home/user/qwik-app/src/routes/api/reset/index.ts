import type { RequestHandler } from "@builder.io/qwik-city";
import { resetBoard } from "~/db/board";

export const onPost: RequestHandler = ({ json }) => {
  const board = resetBoard();
  json(200, board);
};