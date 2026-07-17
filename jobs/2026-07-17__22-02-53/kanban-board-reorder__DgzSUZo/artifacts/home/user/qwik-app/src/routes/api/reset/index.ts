import type { RequestHandler } from '@builder.io/qwik-city';
import { seedDatabase, getBoard } from '../../../lib/db';

export const onPost: RequestHandler = async ({ json }) => {
  seedDatabase();
  const board = getBoard();
  json(200, board);
};
