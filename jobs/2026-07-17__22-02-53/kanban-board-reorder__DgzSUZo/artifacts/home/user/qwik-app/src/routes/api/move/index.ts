import type { RequestHandler } from '@builder.io/qwik-city';
import { moveCard, getBoard } from '../../../lib/db';

export const onPost: RequestHandler = async ({ parseBody, json }) => {
  const body = await parseBody() as any;

  if (!body || typeof body !== 'object') {
    json(400, { error: 'Invalid request body' });
    return;
  }

  const { cardId, toColumn, toIndex } = body;

  // Validate required fields and types
  if (cardId === undefined || cardId === null || typeof cardId !== 'number') {
    json(400, { error: 'cardId must be a number' });
    return;
  }

  if (toColumn === undefined || toColumn === null || typeof toColumn !== 'string') {
    json(400, { error: 'toColumn must be a string' });
    return;
  }

  if (toIndex === undefined || toIndex === null || typeof toIndex !== 'number') {
    json(400, { error: 'toIndex must be a number' });
    return;
  }

  if (toColumn !== 'todo' && toColumn !== 'doing' && toColumn !== 'done') {
    json(400, { error: 'toColumn must be one of "todo", "doing", or "done"' });
    return;
  }

  const result = moveCard(cardId, toColumn, toIndex);

  if (!result.success) {
    json(result.errorStatus || 400, { error: result.errorMessage });
    return;
  }

  const board = getBoard();
  json(200, board);
};
