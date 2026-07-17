import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "form_builder.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export interface FormSchemaField {
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
  fields: FormSchemaField[];
}

export function getFormSchema(formId: string): FormSchema | null {
  const database = getDb();
  const row = database
    .prepare("SELECT schema FROM forms WHERE id = ?")
    .get(formId) as { schema: string } | undefined;

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.schema) as FormSchema;
  } catch {
    return null;
  }
}

export function insertSubmission(
  formId: string,
  data: Record<string, unknown>,
): number {
  const database = getDb();
  const result = database
    .prepare("INSERT INTO submissions (form_id, data) VALUES (?, ?)")
    .run(formId, JSON.stringify(data));
  return result.lastInsertRowid as number;
}
