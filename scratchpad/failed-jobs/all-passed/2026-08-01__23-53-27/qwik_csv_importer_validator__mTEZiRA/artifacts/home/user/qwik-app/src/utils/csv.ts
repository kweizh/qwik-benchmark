export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          curr += '"';
          i++; // Skip next quote
        } else {
          // End of quote
          inQuotes = false;
        }
      } else {
        curr += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(curr);
        curr = '';
      } else if (char === '\r' && nextChar === '\n') {
        row.push(curr);
        curr = '';
        result.push(row);
        row = [];
        i++; // Skip \n
      } else if (char === '\n') {
        row.push(curr);
        curr = '';
        result.push(row);
        row = [];
      } else {
        curr += char;
      }
    }
  }

  // Handle last field/row if not followed by a newline
  if (curr !== '' || row.length > 0) {
    row.push(curr);
    result.push(row);
  }

  return result;
}

export function isRowEmpty(row: string[]): boolean {
  return row.length === 0 || (row.length === 1 && row[0].trim() === '');
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  if (!trimmed) return false;

  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [username, domain] = parts;
  if (!username || !username.trim()) return false;
  if (!domain || !domain.trim()) return false;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;
  for (const part of domainParts) {
    if (!part || !part.trim()) return false;
  }

  if (/\s/.test(username) || /\s/.test(domain)) return false;

  return true;
}

export function isValidAge(ageStr: string): boolean {
  const trimmed = ageStr.trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;
  }
  const age = parseInt(trimmed, 10);
  return age >= 0;
}
