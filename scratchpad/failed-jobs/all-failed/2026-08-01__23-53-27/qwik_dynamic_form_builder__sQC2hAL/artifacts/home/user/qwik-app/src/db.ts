import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database('/home/user/qwik-app/form_builder.sqlite');
  }
  return db;
}
