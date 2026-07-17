import { type RequestHandler } from '@builder.io/qwik-city';
import { getDb, dbRun, dbMutex } from '../../utils/db';
import { parseCSV, isRowEmpty, isValidEmail, isValidAge } from '../../utils/csv';

export const onPost: RequestHandler = async (event) => {
  try {
    const formData = await event.request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      event.json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: ["No file uploaded"]
          }
        ]
      });
      return;
    }

    const csvContent = await (file as any).text();
    const rawRows = parseCSV(csvContent);
    const rows = rawRows.filter(row => !isRowEmpty(row));

    if (rows.length === 0) {
      event.json(200, {
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

    // Header row is rows[0]
    const header = rows[0];
    const nameIdx = header.indexOf('Name');
    const emailIdx = header.indexOf('Email');
    const ageIdx = header.indexOf('Age');

    if (nameIdx === -1 || emailIdx === -1 || ageIdx === -1) {
      event.json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: ["Missing required columns: Name, Email, Age"]
          }
        ]
      });
      return;
    }

    const errors: { row: number; errors: string[] }[] = [];
    const validData: { name: string; email: string; age: number }[] = [];

    // Process rows starting from index 1 (excluding header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const name = row[nameIdx] !== undefined ? row[nameIdx] : '';
      const email = row[emailIdx] !== undefined ? row[emailIdx] : '';
      const ageStr = row[ageIdx] !== undefined ? row[ageIdx] : '';

      const rowErrors: string[] = [];

      if (!name || name.trim() === '') {
        rowErrors.push("Name cannot be empty");
      }
      if (!isValidEmail(email)) {
        rowErrors.push("Invalid email format");
      }
      if (!isValidAge(ageStr)) {
        rowErrors.push("Age must be an integer >= 0");
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: i, // i is the 1-based index of the data row excluding the header
          errors: rowErrors
        });
      } else {
        validData.push({
          name: name.trim(),
          email: email.trim(),
          age: parseInt(ageStr.trim(), 10)
        });
      }
    }

    if (errors.length > 0) {
      errors.sort((a, b) => a.row - b.row);
      event.json(200, {
        success: false,
        imported: 0,
        errors: errors
      });
      return;
    }

    // No errors, insert into database atomically
    const db = await getDb();
    const release = await dbMutex.acquire();

    try {
      await dbRun(db, 'BEGIN TRANSACTION');
      for (const user of validData) {
        await dbRun(db, 'INSERT INTO users (name, email, age) VALUES (?, ?, ?)', [
          user.name,
          user.email,
          user.age
        ]);
      }
      await dbRun(db, 'COMMIT');

      event.json(200, {
        success: true,
        imported: validData.length,
        errors: []
      });
    } catch (dbErr: any) {
      try {
        await dbRun(db, 'ROLLBACK');
      } catch (rollbackErr) {
        // Ignore rollback errors if transaction was already rolled back or not started
      }
      event.json(200, {
        success: false,
        imported: 0,
        errors: [
          {
            row: 1,
            errors: [dbErr.message || "Database transaction error"]
          }
        ]
      });
    } finally {
      release();
    }
  } catch (err: any) {
    event.json(200, {
      success: false,
      imported: 0,
      errors: [
        {
          row: 1,
          errors: [err.message || "An unexpected error occurred"]
        }
      ]
    });
  }
};
