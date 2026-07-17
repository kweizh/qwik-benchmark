import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database('/home/user/qwik-app/poll.db', { timeout: 5000 });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export interface PollInfo {
  id: string;
  question: string;
  options: {
    id: number;
    text: string;
    votes: number;
  }[];
}

export function getPoll(pollId: string): PollInfo | null {
  try {
    const dbInstance = getDb();
    const poll = dbInstance.prepare('SELECT id, question FROM polls WHERE id = ?').get(pollId) as { id: string; question: string } | undefined;
    if (!poll) {
      return null;
    }
    const options = dbInstance.prepare('SELECT id, text, votes FROM options WHERE poll_id = ?').all(pollId) as { id: number; text: string; votes: number }[];
    return {
      id: poll.id,
      question: poll.question,
      options
    };
  } catch (err) {
    console.error('Error fetching poll:', err);
    return null;
  }
}

export interface VoteResult {
  success?: boolean;
  votes?: Record<string, number>;
  error?: string;
  status: number;
}

export function castVote(pollId: string, optionId: number, ip: string): VoteResult {
  try {
    const dbInstance = getDb();
    
    const tx = dbInstance.transaction(() => {
      // 1. Check if poll exists
      const poll = dbInstance.prepare('SELECT id FROM polls WHERE id = ?').get(pollId);
      if (!poll) {
        return { status: 404, error: 'Poll or option not found' };
      }

      // 2. Check if option exists and belongs to the poll
      const option = dbInstance.prepare('SELECT id FROM options WHERE id = ? AND poll_id = ?').get(optionId, pollId);
      if (!option) {
        return { status: 404, error: 'Poll or option not found' };
      }

      // 3. Enforce rate limiting: 1 vote per 5 seconds per poll per IP
      const now = Date.now(); // milliseconds
      const fiveSecondsAgo = now - 5000;

      const recentVote = dbInstance.prepare(
        'SELECT id FROM votes_log WHERE poll_id = ? AND ip = ? AND timestamp >= ?'
      ).get(pollId, ip, fiveSecondsAgo);

      if (recentVote) {
        return { status: 429, error: 'Rate limit exceeded' };
      }

      // 4. Record the vote in votes_log
      dbInstance.prepare(
        'INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)'
      ).run(pollId, ip, now);

      // 5. Increment the vote count
      dbInstance.prepare(
        'UPDATE options SET votes = votes + 1 WHERE id = ? AND poll_id = ?'
      ).run(optionId, pollId);

      // 6. Fetch updated votes
      const options = dbInstance.prepare('SELECT id, votes FROM options WHERE poll_id = ?').all() as { id: number; votes: number }[];
      const votes: Record<string, number> = {};
      for (const opt of options) {
        votes[opt.id.toString()] = opt.votes;
      }

      return { status: 200, success: true, votes };
    });

    return tx.immediate();
  } catch (err: any) {
    console.error('Transaction error:', err);
    return { status: 500, error: 'Internal server error' };
  }
}
