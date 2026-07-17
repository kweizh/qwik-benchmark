export interface UserRow {
  name: string;
  email: string;
  age: string;
}

export interface ValidationError {
  row: number;
  errors: string[];
}

/**
 * Parse a CSV string into an array of UserRow objects.
 * Expects the first line to be the header: Name,Email,Age
 */
export function parseCSV(content: string): UserRow[] {
  const lines = content.split(/\r?\n/);
  const rows: UserRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue;

    const fields = parseCSVLine(line);
    rows.push({
      name: fields[0] ?? "",
      email: fields[1] ?? "",
      age: fields[2] ?? "",
    });
  }

  return rows;
}

/**
 * Parse a single CSV line respecting quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Validate a single row and return error messages.
 * Returns an empty array if the row is valid.
 */
export function validateRow(
  row: UserRow,
  rowIndex: number,
): string[] | null {
  const errors: string[] = [];

  // Name validation
  if (!row.name || row.name.trim() === "") {
    errors.push("Name cannot be empty");
  }

  // Email validation
  if (!isValidEmail(row.email)) {
    errors.push("Invalid email format");
  }

  // Age validation
  if (!isValidAge(row.age)) {
    errors.push("Age must be an integer >= 0");
  }

  return errors.length > 0 ? errors : null;
}

/**
 * Validate all rows. Returns an array of validation errors.
 * If the array is empty, all rows are valid.
 */
export function validateAllRows(rows: UserRow[]): ValidationError[] {
  const validationErrors: ValidationError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const errors = validateRow(rows[i], i + 1);
    if (errors) {
      validationErrors.push({
        row: i + 1, // 1-based index
        errors,
      });
    }
  }

  return validationErrors;
}

/**
 * Check if an email is valid.
 * Must contain a non-empty username, @, and a non-empty domain.
 */
function isValidEmail(email: string): boolean {
  if (!email || email.trim() === "") return false;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return false;

  const username = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);

  if (username.trim() === "" || domain.trim() === "") return false;

  // Domain must contain at least one dot with something on both sides
  // e.g., "example.com"
  const dotIndex = domain.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === domain.length - 1) return false;

  const domainPart = domain.substring(0, dotIndex);
  const tld = domain.substring(dotIndex + 1);

  if (domainPart.trim() === "" || tld.trim() === "") return false;

  return true;
}

/**
 * Check if age is a valid non-negative integer.
 */
function isValidAge(age: string): boolean {
  if (age === undefined || age === null || age.trim() === "") return false;

  // Must be an integer (no decimal point)
  if (!/^\d+$/.test(age.trim())) return false;

  const num = parseInt(age.trim(), 10);
  if (isNaN(num) || num < 0) return false;

  return true;
}
