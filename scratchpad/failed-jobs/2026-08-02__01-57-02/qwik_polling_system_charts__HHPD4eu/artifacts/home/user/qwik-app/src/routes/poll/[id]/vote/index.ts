import type { RequestHandler } from '@builder.io/qwik-city';
import { db } from '~/lib/db';

export const onPost: RequestHandler = async ({ params, request, json, status, clientConn }) => {
  const pollId = params.id;

  // 1. Parse JSON body
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    status(400);
    json({ error: 'Invalid option ID' });
    return;
  }

  const optionId = body?.optionId;

  // 2. Validate optionId
  if (optionId === undefined || typeof optionId !== 'number' || isNaN(optionId) || !Number.isInteger(optionId)) {
    status(400);
    json({ error: 'Invalid option ID' });
    return;
  }

  // 3. Extract client IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  let ip = '127.0.0.1';
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    if (ips.length > 0) {
      ip = ips[0].trim();
    }
  } else if (clientConn.ip) {
    ip = clientConn.ip;
  }

  const now = Date.now();

  try {
    // 4. Run the transaction
    const result = voteTransaction(pollId, optionId, ip, now);

    if (result.error) {
      status(result.status as any);
      json({ error: result.error });
      return;
    }

    // 5. Return success
    status(200);
    json({
      success: true,
      votes: result.votes,
    });
  } catch (error) {
    console.error('Error processing vote:', error);
    status(500);
    json({ error: 'Internal server error' });
  }
};

// Define the transaction with BEGIN IMMEDIATE to handle concurrency
const voteTransaction = db.transaction((pollId: string, optionId: number, ip: string, now: number) => {
  // Check if the poll exists
  const poll = db.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
  if (!poll) {
    return { error: 'Poll or option not found', status: 404 };
  }

  // Check if the option exists and belongs to the poll
  const option = db.prepare('SELECT id FROM options WHERE id = ? AND poll_id = ?').get(optionId, pollId);
  if (!option) {
    return { error: 'Poll or option not found', status: 404 };
  }

  // Enforce rate limit (1 vote per 5 seconds per poll per IP)
  const lastVote = db.prepare(
    'SELECT timestamp FROM votes_log WHERE poll_id = ? AND ip = ? ORDER BY timestamp DESC LIMIT 1'
  ).get(pollId, ip) as { timestamp: number } | undefined;

  if (lastVote && now - lastVote.timestamp < 5000) {
    return { error: 'Rate limit exceeded', status: 429 };
  }

  // Increment vote count
  db.prepare('UPDATE options SET votes = votes + 1 WHERE id = ?').run(optionId);

  // Insert into votes_log
  db.prepare('INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)').run(pollId, ip, now);

  // Get updated vote counts for all options of that poll
  const options = db.prepare('SELECT id, votes FROM options WHERE poll_id = ?').all() as { id: number; votes: number }[];

  const votes: Record<string, number> = {};
  for (const opt of options) {
    votes[String(opt.id)] = opt.votes;
  }

  return { success: true, votes };
}).immediate;
