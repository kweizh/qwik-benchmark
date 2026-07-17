/**
 * Minimal RFC4180-ish CSV parser. Handles quoted fields (including embedded
 * commas, newlines and escaped double-quotes) without any external
 * dependency, as required (server-side only, no client-side CSV libs).
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normalize line endings so \r\n doesn't leak into the last field of a row.
  const input = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  // Push the last field/row if there is any trailing content.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully empty trailing rows (e.g. trailing blank line in the file).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface RowErrors {
  row: number;
  errors: string[];
}

export interface ValidatedUser {
  name: string;
  email: string;
  age: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTEGER_REGEX = /^\d+$/;

export function validateName(name: string | undefined): string | null {
  if (!name || name.trim() === "") {
    return "Name cannot be empty";
  }
  return null;
}

export function validateEmail(email: string | undefined): string | null {
  if (!email || !EMAIL_REGEX.test(email.trim())) {
    return "Invalid email format";
  }
  return null;
}

export function validateAge(age: string | undefined): string | null {
  const trimmed = (age ?? "").trim();
  if (!INTEGER_REGEX.test(trimmed)) {
    return "Age must be an integer >= 0";
  }
  return null;
}

export interface ParseAndValidateResult {
  valid: boolean;
  users: ValidatedUser[];
  errors: RowErrors[];
}

/**
 * Parses the CSV text (with a header row of Name,Email,Age) and validates
 * every data row. Returns the parsed users (only meaningful if all rows are
 * valid) and a list of per-row errors sorted by row number ascending.
 */
export function parseAndValidateCsv(text: string): ParseAndValidateResult {
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return { valid: true, users: [], errors: [] };
  }

  const header = rows[0];
  const nameIdx = header.indexOf("Name");
  const emailIdx = header.indexOf("Email");
  const ageIdx = header.indexOf("Age");

  const dataRows = rows.slice(1);
  const users: ValidatedUser[] = [];
  const errors: RowErrors[] = [];

  dataRows.forEach((cols, index) => {
    const rowNumber = index + 1;
    const name = nameIdx >= 0 ? cols[nameIdx] : undefined;
    const email = emailIdx >= 0 ? cols[emailIdx] : undefined;
    const ageRaw = ageIdx >= 0 ? cols[ageIdx] : undefined;

    const rowErrors: string[] = [];

    const nameError = validateName(name);
    if (nameError) rowErrors.push(nameError);

    const emailError = validateEmail(email);
    if (emailError) rowErrors.push(emailError);

    const ageError = validateAge(ageRaw);
    if (ageError) rowErrors.push(ageError);

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, errors: rowErrors });
    } else {
      users.push({
        name: (name as string).trim(),
        email: (email as string).trim(),
        age: parseInt((ageRaw as string).trim(), 10),
      });
    }
  });

  errors.sort((a, b) => a.row - b.row);

  return {
    valid: errors.length === 0,
    users,
    errors,
  };
}
