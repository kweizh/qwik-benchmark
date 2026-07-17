import type { RequestHandler } from "@builder.io/qwik-city";
import { getFormById, insertSubmission } from "~/lib/db";
import { validateForm } from "~/lib/validate";

export const onPost: RequestHandler = async (requestEvent) => {
  const { params, request, json } = requestEvent;

  const form = getFormById(params.id);

  if (!form) {
    throw requestEvent.error(404, "Form not found");
  }

  const contentType = request.headers.get("content-type") ?? "";
  const rawInput: Record<string, unknown> = {};

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    for (const field of form.schema.fields) {
      rawInput[field.name] = body[field.name];
    }
  } else {
    // application/x-www-form-urlencoded (and multipart/form-data as a bonus)
    const formData = await request.formData();

    for (const field of form.schema.fields) {
      if (field.type === "boolean") {
        // A checkbox is only present in the form data when checked.
        rawInput[field.name] = formData.has(field.name);
      } else {
        const value = formData.get(field.name);
        rawInput[field.name] = value === null ? undefined : value;
      }
    }
  }

  const result = validateForm(form.schema, rawInput);

  if (!result.valid) {
    json(400, { success: false, errors: result.errors });
    return;
  }

  const submissionId = insertSubmission(form.id, result.data);

  json(201, { success: true, submissionId });
};
