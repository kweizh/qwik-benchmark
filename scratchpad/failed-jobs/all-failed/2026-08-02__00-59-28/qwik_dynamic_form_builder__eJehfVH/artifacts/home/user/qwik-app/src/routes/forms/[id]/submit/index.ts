import type { RequestHandler } from "@builder.io/qwik-city";
import {
  getFormSchema,
  insertSubmission,
} from "~/lib/db";
import { validateSubmission } from "~/lib/validation";

export const onPost: RequestHandler = async ({ params, request, json, redirect, status }) => {
  const formId = params.id;

  // Fetch the form schema
  const schema = getFormSchema(formId);
  if (!schema) {
    status(404);
    throw json(404, { success: false, error: "Form not found" });
  }

  // Parse the request body — handle both JSON and form-urlencoded
  let rawData: Record<string, string | string[] | undefined>;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      // Convert JSON body to the same shape as URL-encoded form data
      rawData = {};
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        rawData[key] = value !== null && value !== undefined ? String(value) : undefined;
      }
    } catch {
      status(400);
      throw json(400, { success: false, error: "Invalid JSON body" });
    }
  } else {
    // URL-encoded form data
    const formData = await request.formData();
    rawData = {};
    formData.forEach((value, key) => {
      const existing = rawData[key];
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(value.toString());
        } else {
          rawData[key] = [existing, value.toString()];
        }
      } else {
        rawData[key] = value.toString();
      }
    });
  }

  // Validate
  const result = validateSubmission(schema, rawData);

  if (!result.valid) {
    // Return validation errors as JSON with 400 status
    status(400);
    throw json(400, {
      success: false,
      errors: result.errors,
    });
  }

  // Save to database
  const submissionId = insertSubmission(formId, result.parsedData);

  // Return success response
  status(201);
  throw json(201, {
    success: true,
    submissionId,
  });
};
