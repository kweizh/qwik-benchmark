import Database from "better-sqlite3";
import { existsSync } from "node:fs";

// Resolve the sqlite file relative to the project root regardless of cwd.
const DB_PATH = new URL("../../form_builder.sqlite", import.meta.url)
  .pathname;

let _db: Database.Database | undefined;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = existsSync(DB_PATH) ? DB_PATH : "form_builder.sqlite";
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

export interface FormField {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface FormRow {
  id: string;
  schema: string;
}

export function getFormById(id: string): { id: string; schema: FormSchema } | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id, schema FROM forms WHERE id = ?")
    .get(id) as FormRow | undefined;

  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    schema: JSON.parse(row.schema) as FormSchema,
  };
}

export function insertSubmission(formId: string, data: Record<string, unknown>): number {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO submissions (form_id, data) VALUES (?, ?)",
  );
  const result = stmt.run(formId, JSON.stringify(data));
  return Number(result.lastInsertRowid);
}
