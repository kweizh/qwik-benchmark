import Database from "better-sqlite3";
import path from "node:path";

/**
 * Shared, singleton SQLite connection.
 *
 * We stash the connection on `globalThis` so that Vite's dev-server module
 * reloading (HMR) doesn't spawn a second connection to the same file, which
 * would otherwise be a common source of "database is locked" errors.
 *
 * The connection itself is synchronous (better-sqlite3 executes every
 * statement synchronously on the calling thread). Combined with Node's
 * single-threaded event loop, this means that as long as a logical
 * operation (e.g. "check rate limit, then insert, then update") never
 * `await`s in the middle, no other request can interleave with it. We also
 * wrap the vote-casting logic in an explicit `db.transaction(...)` so the
 * database itself guarantees atomicity (all-or-nothing) and so that SQLite's
 * own locking/retry machinery (via `busy_timeout`) protects us from any
 * external, out-of-process writers as well.
 */

declare global {
  // eslint-disable-next-line no-var
  var __pollDb: DatabaseInstance | undefined;
}

type DatabaseInstance = InstanceType<typeof Database>;

function createConnection(): DatabaseInstance {
  const dbPath = path.resolve(process.cwd(), "poll.db");
  const db = new Database(dbPath);

  // WAL mode allows readers and writers to work concurrently without
  // blocking each other, which is important for reliability under load.
  db.pragma("journal_mode = WAL");
  // NORMAL is safe with WAL and is faster than the default FULL.
  db.pragma("synchronous = NORMAL");
  // If the DB is ever briefly busy (e.g. another process has a write lock),
  // retry for up to 5s instead of throwing SQLITE_BUSY immediately.
  db.pragma("busy_timeout = 5000");
  // Enforce the FOREIGN KEY constraints declared in the schema.
  db.pragma("foreign_keys = ON");

  return db;
}

export function getDb(): DatabaseInstance {
  if (!globalThis.__pollDb) {
    globalThis.__pollDb = createConnection();
  }
  return globalThis.__pollDb;
}

export interface PollRow {
  id: string;
  question: string;
}

export interface OptionRow {
  id: number;
  poll_id: string;
  text: string;
  votes: number;
}

export function getPoll(pollId: string): PollRow | undefined {
  return getDb()
    .prepare("SELECT id, question FROM polls WHERE id = ?")
    .get(pollId) as PollRow | undefined;
}

export function getOptions(pollId: string): OptionRow[] {
  return getDb()
    .prepare(
      "SELECT id, poll_id, text, votes FROM options WHERE poll_id = ? ORDER BY id ASC",
    )
    .all(pollId) as OptionRow[];
}

const RATE_LIMIT_MS = 5000;

export type VoteResult =
  | { ok: true; votes: Record<string, number> }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "rate_limited" };

/**
 * Atomically validates and casts a vote.
 *
 * Everything (the poll/option existence check, the rate-limit check, the
 * insert into `votes_log`, and the increment of `options.votes`) happens
 * inside a single `better-sqlite3` transaction, so concurrent requests can
 * never observe a half-applied state, and no votes can be lost or double
 * counted.
 */
export function castVote(
  pollId: string,
  optionId: number,
  ip: string,
): VoteResult {
  const db = getDb();

  const run = db.transaction((): VoteResult => {
    const poll = db
      .prepare("SELECT id FROM polls WHERE id = ?")
      .get(pollId) as { id: string } | undefined;

    if (!poll) {
      return { ok: false, reason: "not_found" };
    }

    const option = db
      .prepare("SELECT id FROM options WHERE id = ? AND poll_id = ?")
      .get(optionId, pollId) as { id: number } | undefined;

    if (!option) {
      return { ok: false, reason: "not_found" };
    }

    const lastVote = db
      .prepare(
        "SELECT timestamp FROM votes_log WHERE poll_id = ? AND ip = ? ORDER BY timestamp DESC LIMIT 1",
      )
      .get(pollId, ip) as { timestamp: number } | undefined;

    const now = Date.now();
    if (lastVote && now - lastVote.timestamp < RATE_LIMIT_MS) {
      return { ok: false, reason: "rate_limited" };
    }

    db.prepare(
      "INSERT INTO votes_log (poll_id, ip, timestamp) VALUES (?, ?, ?)",
    ).run(pollId, ip, now);

    db.prepare("UPDATE options SET votes = votes + 1 WHERE id = ?").run(
      optionId,
    );

    const updatedOptions = db
      .prepare("SELECT id, votes FROM options WHERE poll_id = ?")
      .all(pollId) as { id: number; votes: number }[];

    const votes: Record<string, number> = {};
    for (const o of updatedOptions) {
      votes[String(o.id)] = o.votes;
    }

    return { ok: true, votes };
  });

  return run();
}
