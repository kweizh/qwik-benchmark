import type { RequestHandler } from "@builder.io/qwik-city";
import { getBoard } from "~/db/board";

export const onGet: RequestHandler = ({ json }) => {
  const board = getBoard();
  json(200, board);
};