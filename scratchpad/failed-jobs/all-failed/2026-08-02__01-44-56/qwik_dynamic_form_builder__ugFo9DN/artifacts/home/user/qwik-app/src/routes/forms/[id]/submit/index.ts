import type { RequestHandler } from "@builder.io/qwik-city";
import db from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  const { params, parseBody, json } = requestEvent;
  const formId = params.id;

  // 1. Fetch the form schema for :id from the SQLite forms table
  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(formId) as
      | { schema: string }
      | undefined;
  } catch (err: any) {
    json(500, { success: false, error: "Database error: " + err.message });
    return;
  }

  if (!row) {
    json(404, { success: false, error: "Form not found" });
    return;
  }

  let schemaObj: any;
  try {
    schemaObj = JSON.parse(row.schema);
  } catch {
    json(500, { success: false, error: "Invalid form schema in database" });
    return;
  }

  const fields = schemaObj.fields || [];

  // 2. Parse the body. parseBody() handles application/json and application/x-www-form-urlencoded!
  let rawBody: any;
  try {
    rawBody = await parseBody();
  } catch (err: any) {
    json(400, {
      success: false,
      error: "Failed to parse request body: " + err.message,
    });
    return;
  }
  const body = rawBody || {};

  const errors: Record<string, string> = {};
  const validatedData: Record<string, any> = {};

  for (const field of fields) {
    const { name, type, required } = field;
    const value = body[name];

    // Check if missing or empty
    const isMissing = value === undefined || value === null;
    const isEmptyString = typeof value === "string" && value.trim() === "";
    const isEmpty = isMissing || isEmptyString;

    if (required) {
      if (isEmpty) {
        errors[name] = `${name} is required`;
        continue;
      }
      if (type === "boolean" && (value === false || value === "false")) {
        errors[name] = `${name} must be checked`;
        continue;
      }
    }

    if (isEmpty) {
      if (type === "boolean") {
        validatedData[name] = false;
      } else {
        validatedData[name] = null;
      }
      continue;
    }

    if (type === "number") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors[name] = `${name} must be a valid number`;
        continue;
      }

      if (field.min !== undefined && numValue < field.min) {
        errors[name] = `${name} must be at least ${field.min}`;
        continue;
      }

      if (field.max !== undefined && numValue > field.max) {
        errors[name] = `${name} must be at most ${field.max}`;
        continue;
      }

      validatedData[name] = numValue;
    } else if (type === "string") {
      const strValue = String(value);

      if (field.minLength !== undefined && strValue.length < field.minLength) {
        errors[name] = `${name} must be at least ${field.minLength} characters`;
        continue;
      }

      if (field.maxLength !== undefined && strValue.length > field.maxLength) {
        errors[name] = `${name} must be at most ${field.maxLength} characters`;
        continue;
      }

      if (field.pattern !== undefined) {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(strValue)) {
            errors[name] = `${name} does not match the required pattern`;
            continue;
          }
        } catch {
          console.error(
            `Invalid regex pattern in schema for field ${name}:`,
            field.pattern,
          );
        }
      }

      validatedData[name] = strValue;
    } else if (type === "boolean") {
      const boolValue =
        value === true ||
        value === "true" ||
        value === "on" ||
        value === 1 ||
        value === "1";
      if (required && !boolValue) {
        errors[name] = `${name} must be checked`;
        continue;
      }
      validatedData[name] = boolValue;
    }
  }

  // 3. If validation fails, return 400 Bad Request
  if (Object.keys(errors).length > 0) {
    json(400, {
      success: false,
      errors,
    });
    return;
  }

  // 4. If validation succeeds, save submission
  try {
    const insertResult = db
      .prepare("INSERT INTO submissions (form_id, data) VALUES (?, ?)")
      .run(formId, JSON.stringify(validatedData));

    json(200, {
      success: true,
      submissionId: Number(insertResult.lastInsertRowid),
    });
    return;
  } catch (err: any) {
    json(500, {
      success: false,
      error: "Failed to save submission to database: " + err.message,
    });
    return;
  }
};
