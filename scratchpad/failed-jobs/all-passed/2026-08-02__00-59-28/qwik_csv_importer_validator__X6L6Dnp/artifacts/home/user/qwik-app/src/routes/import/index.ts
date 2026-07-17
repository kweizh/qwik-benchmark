import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "~/lib/database";
import { parseCSV, validateAllRows } from "~/lib/csv";

export const onPost: RequestHandler = async ({ request, json }) => {
  const db = getDb();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 0,
            errors: ["No file provided"],
          },
        ],
      });
      return;
    }

    const content = await file.text();
    const rows = parseCSV(content);

    if (rows.length === 0) {
      json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 0,
            errors: ["CSV file contains no data rows"],
          },
        ],
      });
      return;
    }

    // Validate all rows
    const validationErrors = validateAllRows(rows);

    if (validationErrors.length > 0) {
      json(200, {
        success: false,
        imported: 0,
        errors: validationErrors,
      });
      return;
    }

    // All rows valid - insert atomically in a transaction
    const insertStmt = db.prepare(
      "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
    );

    const insertAll = db.transaction(() => {
      let count = 0;
      for (const row of rows) {
        insertStmt.run(row.name.trim(), row.email.trim(), parseInt(row.age.trim(), 10));
        count++;
      }
      return count;
    });

    const imported = insertAll();

    json(200, {
      success: true,
      imported,
      errors: [],
    });
  } catch (err) {
    console.error("Import error:", err);
    json(200, {
      success: false,
      imported: 0,
      errors: [
        {
          row: 0,
          errors: ["Failed to process CSV file"],
        },
      ],
    });
  }
};
