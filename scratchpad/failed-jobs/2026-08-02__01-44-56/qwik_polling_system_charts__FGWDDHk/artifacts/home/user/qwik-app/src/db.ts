import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/poll.db';
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export interface Poll {
  id: string;
  question: string;
}

export interface Option {
  id: number;
  poll_id: string;
  text: string;
  votes: number;
}

export function getPoll(id: string): Poll | null {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(id) as Poll | undefined;
  return poll || null;
}

export function getOptions(pollId: string): Option[] {
  return db.prepare('SELECT * FROM options WHERE poll_id = ?').all(pollId) as Option[];
}

export interface VoteResult {
  success: boolean;
  error?: 'rate_limit' | 'not_found';
  votes?: Record<string, number>;
}

export function castVote(ip: string, pollId: string, optionId: number): VoteResult {
  const now = Date.now();

  const transaction = db.transaction(() => {
    // 1. Check if the poll exists
    const poll = db.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
    if (!poll) {
      return { success: false, error: 'not_found' as const };
    }

    // 2. Check if the option exists and belongs to the poll
    const option = db.prepare('SELECT id FROM options WHERE id = ? AND poll_id = ?').get(optionId, pollId);
    if (!option) {
      return { success: false, error: 'not_found' as const };
    }

    // 3. Check rate limit: 1 vote per 5 seconds per poll per IP
    const lastVote = db.prepare('SELECT timestamp FROM votes_log WHERE poll_id = ? AND ip = ? ORDER BY timestamp DESC LIMIT 1').get(pollId, ip) as { timestamp: number } | undefined;
    if (lastVote && (now - lastVote.timestamp < 5000)) {
      return { success: false, error: 'rate_limit' as const };
    }

    // 4. Record the vote in votes_log
    db.prepare('INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)').run(pollId, ip, now);

    // 5. Increment the vote count for the option
    db.prepare('UPDATE options SET votes = votes + 1 WHERE id = ?').run(optionId);

    // 6. Fetch all options for the poll to return updated counts
    const options = db.prepare('SELECT id, votes FROM options WHERE poll_id = ?').all(pollId) as Array<{ id: number, votes: number }>;
    
    const votes: Record<string, number> = {};
    for (const opt of options) {
      votes[opt.id.toString()] = opt.votes;
    }

    return { success: true, votes };
  });

  try {
    return transaction.immediate();
  } catch (err) {
    console.error('Transaction failed:', err);
    throw err;
  }
}
