import type { RequestHandler } from '@builder.io/qwik-city';
import { getBoard } from '../../../lib/db';

export const onGet: RequestHandler = async ({ json }) => {
  const board = getBoard();
  json(200, board);
};
