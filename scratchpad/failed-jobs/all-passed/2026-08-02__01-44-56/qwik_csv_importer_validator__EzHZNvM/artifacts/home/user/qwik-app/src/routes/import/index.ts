import { type RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../lib/db";

// Helper to parse CSV
function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\r' || char === '\n') {
        row.push(cell);
        cell = '';
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      result.push(row);
    }
  }

  return result;
}

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      json(400, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["No file uploaded or invalid file field"] }]
      });
      return;
    }

    const text = await (file as any).text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      json(200, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["CSV file is empty"] }]
      });
      return;
    }

    const headerRow = parsed[0];
    const nameIdx = headerRow.indexOf("Name");
    const emailIdx = headerRow.indexOf("Email");
    const ageIdx = headerRow.indexOf("Age");

    if (nameIdx === -1 || emailIdx === -1 || ageIdx === -1) {
      json(200, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["Missing required headers: Name, Email, Age"] }]
      });
      return;
    }

    interface ValidationError {
      row: number;
      errors: string[];
    }

    const errors: ValidationError[] = [];
    const validRows: { name: string; email: string; age: number }[] = [];

    // Process each data row (1-based index for rows, excluding header row)
    for (let i = 1; i < parsed.length; i++) {
      const row = parsed[i];
      const name = (row[nameIdx] ?? "").trim();
      const email = (row[emailIdx] ?? "").trim();
      const ageStr = (row[ageIdx] ?? "").trim();

      const rowErrors: string[] = [];

      // Name validation
      if (name === "") {
        rowErrors.push("Name cannot be empty");
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        rowErrors.push("Invalid email format");
      }

      // Age validation
      const ageRegex = /^\d+$/;
      if (!ageRegex.test(ageStr)) {
        rowErrors.push("Age must be an integer >= 0");
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: i,
          errors: rowErrors
        });
      } else {
        validRows.push({
          name,
          email,
          age: parseInt(ageStr, 10)
        });
      }
    }

    if (errors.length > 0) {
      // Sort errors by row ascending
      errors.sort((a, b) => a.row - b.row);
      json(200, {
        success: false,
        imported: 0,
        errors
      });
      return;
    }

    // Perform atomic database transaction
    const db = await getDb();
    await db.run("BEGIN TRANSACTION");
    try {
      for (const row of validRows) {
        await db.run(
          "INSERT INTO users (name, email, age) VALUES (?, ?, ?)",
          row.name,
          row.email,
          row.age
        );
      }
      await db.run("COMMIT");
    } catch (dbError) {
      await db.run("ROLLBACK");
      throw dbError;
    }

    json(200, {
      success: true,
      imported: validRows.length,
      errors: []
    });

  } catch (error: any) {
    json(500, {
      success: false,
      imported: 0,
      errors: [{ row: 0, errors: [error?.message || "Internal Server Error"] }]
    });
  }
};
