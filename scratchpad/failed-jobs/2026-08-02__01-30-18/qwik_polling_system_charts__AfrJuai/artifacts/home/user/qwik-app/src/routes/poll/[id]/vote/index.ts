import type { RequestHandler } from '@builder.io/qwik-city';
import { castVote } from '../../../../db';

export const onPost: RequestHandler = async (event) => {
  const { params, request, json, clientConn } = event;
  const pollId = params.id;

  let body: any;
  try {
    body = await request.json();
  } catch {
    json(400, { error: 'Invalid option ID' });
    return;
  }

  if (!body || typeof body !== 'object' || !('optionId' in body)) {
    json(400, { error: 'Invalid option ID' });
    return;
  }

  const rawOptionId = body.optionId;
  if (rawOptionId === undefined || rawOptionId === null || typeof rawOptionId === 'boolean') {
    json(400, { error: 'Invalid option ID' });
    return;
  }

  const optionId = Number(rawOptionId);
  if (!Number.isInteger(optionId)) {
    json(400, { error: 'Invalid option ID' });
    return;
  }

  // Extract IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  let ip = '127.0.0.1';
  if (xForwardedFor) {
    const parts = xForwardedFor.split(',');
    if (parts[0]) {
      ip = parts[0].trim();
    }
  } else if (clientConn && clientConn.ip) {
    ip = clientConn.ip;
  }

  const result = castVote(pollId, optionId, ip);

  if (result.status === 200) {
    json(200, {
      success: true,
      votes: result.votes,
    });
    return;
  } else if (result.status === 429) {
    json(429, { error: 'Rate limit exceeded' });
    return;
  } else if (result.status === 404) {
    json(404, { error: 'Poll or option not found' });
    return;
  } else {
    json(result.status || 500, { error: result.error || 'Internal server error' });
    return;
  }
};
