import type { RequestHandler } from "@builder.io/qwik-city";
import { parseAndValidateCsv } from "~/lib/csv";
import { insertUsersAtomically } from "~/lib/db";

export const onPost: RequestHandler = async (requestEvent) => {
  let formData: FormData;
  try {
    formData = await requestEvent.request.formData();
  } catch {
    requestEvent.json(200, {
      success: false,
      imported: 0,
      errors: [{ row: 0, errors: ["No file uploaded"] }],
    });
    return;
  }

  const file = formData.get("file");

  if (!file || typeof file === "string") {
    requestEvent.json(200, {
      success: false,
      imported: 0,
      errors: [{ row: 0, errors: ["No file uploaded"] }],
    });
    return;
  }

  const text = await (file as File).text();
  const { valid, users, errors } = parseAndValidateCsv(text);

  if (!valid) {
    requestEvent.json(200, {
      success: false,
      imported: 0,
      errors,
    });
    return;
  }

  const imported = insertUsersAtomically(users);

  requestEvent.json(200, {
    success: true,
    imported,
    errors: [],
  });
};
