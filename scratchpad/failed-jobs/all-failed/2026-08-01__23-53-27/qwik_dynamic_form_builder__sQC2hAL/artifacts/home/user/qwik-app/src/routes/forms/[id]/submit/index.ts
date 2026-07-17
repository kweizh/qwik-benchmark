import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../../../db";
import { validateForm } from "../../../../validation";

export const onPost: RequestHandler = async (event) => {
  const { params, parseBody, json } = event;
  const formId = params.id;

  const db = getDb();
  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(formId) as { schema: string } | undefined;
  } catch {
    json(500, { success: false, errors: { db: "Database query error" } });
    return;
  }

  if (!row) {
    json(404, { success: false, errors: { form: "Form not found" } });
    return;
  }

  let schema: any;
  try {
    schema = JSON.parse(row.schema);
  } catch {
    json(500, { success: false, errors: { schema: "Invalid schema stored in database" } });
    return;
  }

  let rawBody: any;
  try {
    rawBody = await parseBody();
  } catch {
    json(400, { success: false, errors: { body: "Invalid request body" } });
    return;
  }

  // Normalize request body to a standard record
  const dataToValidate: Record<string, any> = {};
  if (rawBody && typeof rawBody === "object") {
    if (typeof (rawBody as any).entries === "function") {
      // It's a FormData or URLSearchParams object
      for (const [key, value] of (rawBody as any).entries()) {
        dataToValidate[key] = value;
      }
    } else {
      // It's a standard JSON object
      Object.assign(dataToValidate, rawBody);
    }
  }

  // Validate form
  const validationResult = validateForm(schema, dataToValidate);

  if (!validationResult.success) {
    json(400, {
      success: false,
      errors: validationResult.errors,
    });
    return;
  }

  // Save valid submission to submissions table
  try {
    const stmt = db.prepare("INSERT INTO submissions (form_id, data) VALUES (?, ?)");
    const info = stmt.run(formId, JSON.stringify(validationResult.data));
    json(200, {
      success: true,
      submissionId: Number(info.lastInsertRowid),
    });
    return;
  } catch {
    json(500, { success: false, errors: { db: "Database save error" } });
    return;
  }
};
