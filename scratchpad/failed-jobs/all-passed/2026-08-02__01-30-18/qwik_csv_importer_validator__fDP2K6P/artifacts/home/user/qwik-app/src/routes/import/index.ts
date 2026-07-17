import type { RequestHandler } from '@builder.io/qwik-city';
import { getDB } from '../../lib/db';
import { parseCSV } from '../../lib/csv';

export const onPost: RequestHandler = async ({ request, json }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file || typeof file === 'string') {
      json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: ["No file uploaded or invalid file field"]
          }
        ]
      });
      return;
    }

    let text = await file.text();
    if (text.startsWith('\ufeff')) {
      text = text.slice(1);
    }

    const rows = parseCSV(text);
    if (rows.length === 0) {
      json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: ["CSV file is empty"]
          }
        ]
      });
      return;
    }

    const headers = rows[0].map(h => h.trim());
    const nameIdx = headers.indexOf('Name');
    const emailIdx = headers.indexOf('Email');
    const ageIdx = headers.indexOf('Age');

    if (nameIdx === -1 || emailIdx === -1 || ageIdx === -1) {
      json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: ["Missing required CSV columns (Name, Email, Age)"]
          }
        ]
      });
      return;
    }

    const allErrors: { row: number; errors: string[] }[] = [];
    const validUsers: { name: string; email: string; age: number }[] = [];

    // Skip header row at rows[0]
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip completely empty rows
      if (row.length === 0 || (row.length === 1 && row[0].trim() === '')) {
        continue;
      }

      const name = (row[nameIdx] !== undefined ? row[nameIdx] : '').trim();
      const email = (row[emailIdx] !== undefined ? row[emailIdx] : '').trim();
      const ageStr = (row[ageIdx] !== undefined ? row[ageIdx] : '').trim();

      const rowErrors: string[] = [];

      // 1. Name validation
      if (!name) {
        rowErrors.push("Name cannot be empty");
      }

      // 2. Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        rowErrors.push("Invalid email format");
      }

      // 3. Age validation
      if (!ageStr || !/^\d+$/.test(ageStr)) {
        rowErrors.push("Age must be an integer >= 0");
      }

      if (rowErrors.length > 0) {
        allErrors.push({
          row: i, // 1-based index of the data row excluding the header
          errors: rowErrors
        });
      } else {
        validUsers.push({
          name,
          email,
          age: parseInt(ageStr, 10)
        });
      }
    }

    if (allErrors.length > 0) {
      // Sort errors by row ascending
      allErrors.sort((a, b) => a.row - b.row);
      json(200, {
        success: false,
        imported: 0,
        errors: allErrors
      });
      return;
    }

    // Atomically insert users
    const db = getDB();
    const insertUser = db.prepare('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
    
    const insertMany = db.transaction((usersList: typeof validUsers) => {
      for (const user of usersList) {
        insertUser.run(user.name, user.email, user.age);
      }
    });

    insertMany(validUsers);

    json(200, {
      success: true,
      imported: validUsers.length,
      errors: []
    });

  } catch (error: any) {
    json(200, {
      success: false,
      imported: 0,
      errors: [
        {
          row: 1,
          errors: [error?.message || "An unexpected error occurred during import"]
        }
      ]
    });
  }
};
