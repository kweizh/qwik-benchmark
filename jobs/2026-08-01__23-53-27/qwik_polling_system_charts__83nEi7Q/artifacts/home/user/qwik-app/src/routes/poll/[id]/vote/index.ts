import type { RequestHandler } from '@builder.io/qwik-city';
import { getDb } from '../../../../lib/db.server';

export const onPost: RequestHandler = async (event) => {
  const pollId = event.params.id;

  let body: any;
  try {
    body = await event.request.json();
  } catch (e) {
    throw event.json(400, { error: 'Invalid option ID' });
  }

  if (!body || typeof body.optionId !== 'number') {
    throw event.json(400, { error: 'Invalid option ID' });
  }

  const optionId = body.optionId;
  const db = getDb();

  // Extract client IP
  const xForwardedFor = event.request.headers.get('x-forwarded-for');
  let ip = '';
  if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0].trim();
  } else {
    ip = event.clientConn?.ip || '127.0.0.1';
  }

  const now = Date.now();

  let result: { success?: boolean; error?: string };
  try {
    result = db.transaction(() => {
      // 1. Check if poll exists
      const poll = db.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
      if (!poll) {
        return { error: 'not_found' };
      }

      // 2. Check if option exists and belongs to the poll
      const option = db.prepare('SELECT id, poll_id FROM options WHERE id = ?').get(optionId) as { id: number; poll_id: string } | undefined;
      if (!option || option.poll_id !== pollId) {
        return { error: 'not_found' };
      }

      // 3. Check rate limit (1 vote per 5 seconds per poll per IP)
      const limitTime = now - 5000;
      const recentVote = db.prepare(
        'SELECT 1 FROM votes_log WHERE poll_id = ? AND ip = ? AND timestamp >= ? LIMIT 1'
      ).get(pollId, ip, limitTime);

      if (recentVote) {
        return { error: 'rate_limit' };
      }

      // 4. Record vote log
      db.prepare('INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)')
        .run(pollId, ip, now);

      // 5. Increment vote count
      db.prepare('UPDATE options SET votes = votes + 1 WHERE id = ?')
        .run(optionId);

      return { success: true };
    })();
  } catch (err: any) {
    throw event.json(500, { error: err.message || 'Internal Server Error' });
  }

  if (result.error === 'not_found') {
    throw event.json(404, { error: 'Poll or option not found' });
  }

  if (result.error === 'rate_limit') {
    throw event.json(429, { error: 'Rate limit exceeded' });
  }

  // Success! Fetch updated vote counts for all options of that poll
  let options: { id: number; votes: number }[];
  try {
    options = db.prepare('SELECT id, votes FROM options WHERE poll_id = ?').all(pollId) as { id: number; votes: number }[];
  } catch (err: any) {
    throw event.json(500, { error: err.message || 'Internal Server Error' });
  }

  const votesObj: Record<string, number> = {};
  for (const opt of options) {
    votesObj[String(opt.id)] = opt.votes;
  }

  throw event.json(200, {
    success: true,
    votes: votesObj
  });
};
