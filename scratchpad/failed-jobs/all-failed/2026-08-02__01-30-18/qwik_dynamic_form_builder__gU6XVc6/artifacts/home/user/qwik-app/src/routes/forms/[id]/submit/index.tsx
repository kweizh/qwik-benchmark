import type { RequestHandler } from "@builder.io/qwik-city";
import { getFormById, insertSubmission, type FormSchema } from "~/lib/db";

export const onPost: RequestHandler = async (event) => {
  const { params, request, json } = event;
  const { id } = params;

  // 1. Fetch form
  const formRow = getFormById(id);
  if (!formRow) {
    json(404, {
      success: false,
      message: "Form not found",
    });
    return;
  }

  let schema: FormSchema;
  try {
    schema = JSON.parse(formRow.schema) as FormSchema;
  } catch (err) {
    json(500, {
      success: false,
      message: "Invalid form schema in database",
    });
    return;
  }

  // 2. Parse request body (JSON or URL-encoded)
  let body: Record<string, any> = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      for (const key of formData.keys()) {
        body[key] = formData.get(key);
      }
    }
  } catch (err) {
    json(400, {
      success: false,
      message: "Invalid request payload",
    });
    return;
  }

  // 3. Validate against schema
  const validatedData: Record<string, any> = {};
  const errors: Record<string, string> = {};

  for (const field of schema.fields) {
    const val = body[field.name];

    if (field.type === "boolean") {
      const parsedVal = (val === "on" || val === "true" || val === true || val === 1 || val === "1");
      if (field.required && !parsedVal) {
        errors[field.name] = `${field.name} is required`;
      } else {
        validatedData[field.name] = parsedVal;
      }
    } else if (field.type === "number") {
      if (val === undefined || val === null || String(val).trim() === "") {
        if (field.required) {
          errors[field.name] = `${field.name} is required`;
        } else {
          validatedData[field.name] = null;
        }
      } else {
        const parsedNum = Number(val);
        if (isNaN(parsedNum)) {
          errors[field.name] = `${field.name} must be a number`;
        } else {
          if (field.min !== undefined && parsedNum < field.min) {
            errors[field.name] = `${field.name} must be at least ${field.min}`;
          } else if (field.max !== undefined && parsedNum > field.max) {
            errors[field.name] = `${field.name} must be at most ${field.max}`;
          } else {
            validatedData[field.name] = parsedNum;
          }
        }
      }
    } else if (field.type === "string") {
      if (val === undefined || val === null || String(val).trim() === "") {
        if (field.required) {
          errors[field.name] = `${field.name} is required`;
        } else {
          validatedData[field.name] = "";
        }
      } else {
        const strVal = String(val);
        if (field.minLength !== undefined && strVal.length < field.minLength) {
          errors[field.name] = `${field.name} must be at least ${field.minLength} characters`;
        } else if (field.maxLength !== undefined && strVal.length > field.maxLength) {
          errors[field.name] = `${field.name} must be at most ${field.maxLength} characters`;
        } else if (field.pattern !== undefined) {
          try {
            const regex = new RegExp(field.pattern);
            if (!regex.test(strVal)) {
              errors[field.name] = `${field.name} is invalid`;
            } else {
              validatedData[field.name] = strVal;
            }
          } catch (e) {
            validatedData[field.name] = strVal;
          }
        } else {
          validatedData[field.name] = strVal;
        }
      }
    }
  }

  // 4. Return errors if any
  if (Object.keys(errors).length > 0) {
    json(400, {
      success: false,
      errors,
    });
    return;
  }

  // 5. Save submission
  try {
    const submissionId = insertSubmission(id, JSON.stringify(validatedData));
    json(201, {
      success: true,
      submissionId,
    });
    return;
  } catch (err: any) {
    json(500, {
      success: false,
      message: err.message || "Failed to save submission",
    });
    return;
  }
};
