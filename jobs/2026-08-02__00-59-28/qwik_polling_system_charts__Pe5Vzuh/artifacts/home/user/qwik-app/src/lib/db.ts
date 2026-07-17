import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "poll.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    // Enable WAL mode for better concurrent read/write performance
    db.pragma("journal_mode = WAL");
    // Enable busy timeout to wait for locks instead of immediately failing
    db.pragma("busy_timeout = 5000");
  }
  return db;
}

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

export function getPoll(pollId: string): Poll | undefined {
  const database = getDb();
  const stmt = database.prepare("SELECT id, question FROM polls WHERE id = ?");
  return stmt.get(pollId) as Poll | undefined;
}

export function getOptions(pollId: string): Option[] {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT id, poll_id, text, votes FROM options WHERE poll_id = ? ORDER BY id"
  );
  return stmt.all(pollId) as Option[];
}

export function getOptionById(optionId: number): Option | undefined {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT id, poll_id, text, votes FROM options WHERE id = ?"
  );
  return stmt.get(optionId) as Option | undefined;
}

export function castVote(pollId: string, optionId: number): Option[] {
  const database = getDb();

  // Use a transaction for atomic vote increment
  const voteTransaction = database.transaction(() => {
    // Increment the vote count atomically
    const updateStmt = database.prepare(
      "UPDATE options SET votes = votes + 1 WHERE id = ? AND poll_id = ?"
    );
    const result = updateStmt.run(optionId, pollId);

    if (result.changes === 0) {
      throw new Error("Option not found for this poll");
    }

    // Return updated vote counts for all options of the poll
    const selectStmt = database.prepare(
      "SELECT id, poll_id, text, votes FROM options WHERE poll_id = ? ORDER BY id"
    );
    return selectStmt.all(pollId) as Option[];
  });

  return voteTransaction();
}

export function checkRateLimit(
  pollId: string,
  ip: string,
  windowSeconds: number = 5
): boolean {
  const database = getDb();
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - windowSeconds;

  const stmt = database.prepare(
    "SELECT id FROM votes_log WHERE poll_id = ? AND ip = ? AND timestamp > ? LIMIT 1"
  );
  const recentVote = stmt.get(pollId, ip, cutoff);

  return recentVote === undefined;
}

export function logVote(pollId: string, ip: string): void {
  const database = getDb();
  const now = Math.floor(Date.now() / 1000);
  const stmt = database.prepare(
    "INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)"
  );
  stmt.run(pollId, ip, now);
}

export function castVoteWithRateLimit(
  pollId: string,
  optionId: number,
  ip: string
): Option[] {
  const database = getDb();

  // Use a transaction for atomicity: check rate limit, log vote, increment vote
  const voteTransaction = database.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - 5;

    // Check rate limit within the transaction for atomicity
    const rateStmt = database.prepare(
      "SELECT id FROM votes_log WHERE poll_id = ? AND ip = ? AND timestamp > ? LIMIT 1"
    );
    const recentVote = rateStmt.get(pollId, ip, cutoff);

    if (recentVote) {
      throw new Error("Rate limit exceeded");
    }

    // Log the vote
    const logStmt = database.prepare(
      "INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)"
    );
    logStmt.run(pollId, ip, now);

    // Increment the vote count atomically
    const updateStmt = database.prepare(
      "UPDATE options SET votes = votes + 1 WHERE id = ? AND poll_id = ?"
    );
    const result = updateStmt.run(optionId, pollId);

    if (result.changes === 0) {
      throw new Error("Poll or option not found");
    }

    // Return updated vote counts for all options of the poll
    const selectStmt = database.prepare(
      "SELECT id, poll_id, text, votes FROM options WHERE poll_id = ? ORDER BY id"
    );
    return selectStmt.all(pollId) as Option[];
  });

  return voteTransaction();
}
