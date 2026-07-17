import type { FormSchema, FormSchemaField } from "./db";

export interface ValidationErrors {
  [fieldName: string]: string;
}

export function validateSubmission(
  schema: FormSchema,
  rawData: Record<string, string | string[] | undefined>,
): { valid: true; parsedData: Record<string, unknown> } | { valid: false; errors: ValidationErrors } {
  const errors: ValidationErrors = {};
  const parsedData: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const rawValue = rawData[field.name];

    if (field.type === "boolean") {
      // Checkbox: if present in form data (checked), it's true; otherwise false
      const isChecked = rawValue !== undefined;
      parsedData[field.name] = isChecked;

      if (field.required && !isChecked) {
        errors[field.name] = `${field.name} is required`;
      }
    } else if (field.type === "number") {
      const strValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;

      if (strValue === undefined || strValue === "") {
        if (field.required) {
          errors[field.name] = `${field.name} is required`;
        } else {
          parsedData[field.name] = null;
        }
      } else {
        const numValue = Number(strValue);
        if (isNaN(numValue)) {
          errors[field.name] = `${field.name} must be a valid number`;
        } else {
          if (field.min !== undefined && numValue < field.min) {
            errors[field.name] = `${field.name} must be at least ${field.min}`;
          }
          if (field.max !== undefined && numValue > field.max) {
            errors[field.name] = `${field.name} must be at most ${field.max}`;
          }
          if (!errors[field.name]) {
            parsedData[field.name] = numValue;
          }
        }
      }
    } else if (field.type === "string") {
      const strValue = Array.isArray(rawValue) ? rawValue[0] : rawValue;

      if (strValue === undefined || strValue === "") {
        if (field.required) {
          errors[field.name] = `${field.name} is required`;
        } else {
          parsedData[field.name] = "";
        }
      } else {
        if (field.minLength !== undefined && strValue.length < field.minLength) {
          errors[field.name] = `${field.name} must be at least ${field.minLength} characters`;
        }
        if (field.maxLength !== undefined && strValue.length > field.maxLength) {
          errors[field.name] = `${field.name} must be at most ${field.maxLength} characters`;
        }
        if (field.pattern) {
          try {
            const regex = new RegExp(field.pattern);
            if (!regex.test(strValue)) {
              errors[field.name] = `${field.name} does not match the required pattern`;
            }
          } catch {
            // Invalid regex pattern — skip validation
          }
        }
        if (!errors[field.name]) {
          parsedData[field.name] = strValue;
        }
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, parsedData };
}
