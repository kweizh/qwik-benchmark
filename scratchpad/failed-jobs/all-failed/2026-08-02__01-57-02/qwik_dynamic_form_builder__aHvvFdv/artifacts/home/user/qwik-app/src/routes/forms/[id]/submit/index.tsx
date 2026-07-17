import type { RequestHandler } from "@builder.io/qwik-city";
import db from "../../../../db";
import { validateSubmission } from "../../../../validator";

export const onPost: RequestHandler = async (event) => {
  const { params, parseBody, json } = event;
  const { id } = params;

  // 1. Fetch the form schema for :id from the SQLite forms table
  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(id) as { schema: string } | undefined;
  } catch (err) {
    json(500, { success: false, error: "Database error" });
    return;
  }

  // 2. If the form ID does not exist, return a 404 Not Found response
  if (!row) {
    json(404, { success: false, error: "Form not found" });
    return;
  }

  let schema;
  try {
    schema = JSON.parse(row.schema);
  } catch (err) {
    json(500, { success: false, error: "Invalid form schema in database" });
    return;
  }

  // 3. Parse the body (supports application/json and application/x-www-form-urlencoded)
  let body: any;
  try {
    body = await parseBody();
  } catch (err) {
    json(400, { success: false, error: "Invalid request body" });
    return;
  }

  // 4. Validate the submitted data against the schema
  const validation = validateSubmission(schema, body);

  if (!validation.success) {
    // Validation Failure Response
    json(400, {
      success: false,
      errors: validation.errors,
    });
    return;
  }

  // 5. Validation Success Response: Save submission to table
  try {
    const stmt = db.prepare("INSERT INTO submissions (form_id, data) VALUES (?, ?)");
    const result = stmt.run(id, JSON.stringify(validation.data));
    const submissionId = Number(result.lastInsertRowid);

    json(200, {
      success: true,
      submissionId,
    });
    return;
  } catch (err) {
    json(500, { success: false, error: "Failed to save submission" });
    return;
  }
};
