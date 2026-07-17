import Database from 'better-sqlite3';

const dbPath = '/home/user/qwik-app/poll.db';

export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
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

export interface VoteLog {
  id: number;
  poll_id: string;
  ip: string;
  timestamp: number;
}
