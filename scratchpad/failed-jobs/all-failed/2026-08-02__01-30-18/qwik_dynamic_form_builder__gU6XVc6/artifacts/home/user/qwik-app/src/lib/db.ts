import Database from "better-sqlite3";

const dbPath = "/home/user/qwik-app/form_builder.sqlite";

const db = new Database(dbPath);

// Initialize tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    schema TEXT
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface FormField {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
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
  schema: string; // JSON string of FormSchema
}

export function getFormById(id: string): FormRow | null {
  const stmt = db.prepare("SELECT * FROM forms WHERE id = ?");
  const row = stmt.get(id) as FormRow | undefined;
  return row || null;
}

export function insertSubmission(formId: string, data: string): number {
  const stmt = db.prepare("INSERT INTO submissions (form_id, data) VALUES (?, ?)");
  const result = stmt.run(formId, data);
  return result.lastInsertRowid as number;
}
