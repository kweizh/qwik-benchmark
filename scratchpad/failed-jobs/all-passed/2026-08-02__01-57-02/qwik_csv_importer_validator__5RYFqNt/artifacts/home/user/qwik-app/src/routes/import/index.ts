import type { RequestHandler } from "@builder.io/qwik-city";
import { getDb } from "../../lib/db";

function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r' || char === '\n') {
        row.push(field);
        field = '';
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        field += char;
      }
    }
  }
  
  if (field !== '' || row.length > 0) {
    row.push(field);
    result.push(row);
  }
  
  return result;
}

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      json(200, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["No file uploaded or invalid file field"] }]
      });
      return;
    }

    const csvText = await file.text();
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      json(200, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["CSV file is empty"] }]
      });
      return;
    }

    const headers = parsed[0].map(h => h.trim());
    const nameIdx = headers.indexOf("Name");
    const emailIdx = headers.indexOf("Email");
    const ageIdx = headers.indexOf("Age");

    if (nameIdx === -1 || emailIdx === -1 || ageIdx === -1) {
      json(200, {
        success: false,
        imported: 0,
        errors: [{ row: 0, errors: ["Missing required headers: Name, Email, Age"] }]
      });
      return;
    }

    const errors: { row: number; errors: string[] }[] = [];
    const validRows: { name: string; email: string; age: number }[] = [];

    for (let i = 1; i < parsed.length; i++) {
      const row = parsed[i];
      const rowNum = i; // 1-based index of the data row (excluding header)

      const rowErrors: string[] = [];

      // 1. Name
      const name = row[nameIdx] !== undefined ? row[nameIdx].trim() : "";
      if (!name) {
        rowErrors.push("Name cannot be empty");
      }

      // 2. Email
      const email = row[emailIdx] !== undefined ? row[emailIdx].trim() : "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        rowErrors.push("Invalid email format");
      }

      // 3. Age
      const ageStr = row[ageIdx] !== undefined ? row[ageIdx].trim() : "";
      if (!ageStr || !/^\d+$/.test(ageStr)) {
        rowErrors.push("Age must be an integer >= 0");
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          errors: rowErrors,
        });
      } else {
        validRows.push({
          name,
          email,
          age: parseInt(ageStr, 10),
        });
      }
    }

    if (errors.length > 0) {
      json(200, {
        success: false,
        imported: 0,
        errors,
      });
      return;
    }

    // Perform database insertion in a transaction
    const db = getDb();
    const insert = db.prepare("INSERT INTO users (name, email, age) VALUES (?, ?, ?)");
    const insertMany = db.transaction((rows: typeof validRows) => {
      for (const r of rows) {
        insert.run(r.name, r.email, r.age);
      }
    });

    insertMany(validRows);

    json(200, {
      success: true,
      imported: validRows.length,
      errors: [],
    });
  } catch (err: any) {
    json(200, {
      success: false,
      imported: 0,
      errors: [{ row: 0, errors: ["Internal server error: " + err.message] }],
    });
  }
};
