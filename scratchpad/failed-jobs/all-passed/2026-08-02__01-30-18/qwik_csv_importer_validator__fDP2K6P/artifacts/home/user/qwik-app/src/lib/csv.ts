/**
 * Robust RFC-4180 compliant CSV parser.
 * Handles commas, double quotes, escaped quotes (""), and newlines inside quotes.
 */
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentField = '';
  
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
        } else {
          // Closing quote
          inQuotes = false;
          i += 1;
        }
      } else {
        currentField += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === ',') {
        row.push(currentField);
        currentField = '';
        i += 1;
      } else if (char === '\r' && nextChar === '\n') {
        row.push(currentField);
        result.push(row);
        row = [];
        currentField = '';
        i += 2;
      } else if (char === '\n') {
        row.push(currentField);
        result.push(row);
        row = [];
        currentField = '';
        i += 1;
      } else if (char === '\r') {
        row.push(currentField);
        result.push(row);
        row = [];
        currentField = '';
        i += 1;
      } else {
        currentField += char;
        i += 1;
      }
    }
  }
  
  // Handle the last field and row if the file didn't end with a newline
  if (currentField !== '' || row.length > 0 || (i > 0 && text[i - 1] === ',')) {
    row.push(currentField);
    result.push(row);
  }
  
  // If the last row is empty (e.g. trailing newline), filter it out
  if (result.length > 0 && result[result.length - 1].length === 1 && result[result.length - 1][0] === '') {
    result.pop();
  }
  
  return result;
}
