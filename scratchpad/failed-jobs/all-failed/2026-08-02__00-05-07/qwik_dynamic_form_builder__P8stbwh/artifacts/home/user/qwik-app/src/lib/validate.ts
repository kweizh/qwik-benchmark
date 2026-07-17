import type { FormField, FormSchema } from "./db";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  data: Record<string, unknown>;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "on" || normalized === "1";
}

function validateField(
  field: FormField,
  rawValue: unknown,
): { error?: string; value: unknown } {
  switch (field.type) {
    case "string": {
      if (isEmpty(rawValue)) {
        if (field.required) {
          return { error: `${field.name} is required.`, value: undefined };
        }
        return { value: undefined };
      }

      const value = String(rawValue);

      if (field.minLength !== undefined && value.length < field.minLength) {
        return {
          error: `${field.name} must be at least ${field.minLength} characters long.`,
          value,
        };
      }

      if (field.maxLength !== undefined && value.length > field.maxLength) {
        return {
          error: `${field.name} must be at most ${field.maxLength} characters long.`,
          value,
        };
      }

      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
          return {
            error: `${field.name} does not match the required format.`,
            value,
          };
        }
      }

      return { value };
    }

    case "number": {
      if (isEmpty(rawValue)) {
        if (field.required) {
          return { error: `${field.name} is required.`, value: undefined };
        }
        return { value: undefined };
      }

      const value = typeof rawValue === "number" ? rawValue : Number(rawValue);

      if (Number.isNaN(value)) {
        return {
          error: `${field.name} must be a valid number.`,
          value: undefined,
        };
      }

      if (field.min !== undefined && value < field.min) {
        return {
          error: `${field.name} must be at least ${field.min}.`,
          value,
        };
      }

      if (field.max !== undefined && value > field.max) {
        return {
          error: `${field.name} must be at most ${field.max}.`,
          value,
        };
      }

      return { value };
    }

    case "boolean": {
      const value = toBoolean(rawValue);

      if (field.required && value !== true) {
        return {
          error: `${field.name} must be checked.`,
          value,
        };
      }

      return { value };
    }

    default:
      return { value: rawValue };
  }
}

export function validateForm(
  schema: FormSchema,
  input: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {};
  const data: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const rawValue = input[field.name];
    const { error, value } = validateField(field, rawValue);

    if (error) {
      errors[field.name] = error;
    } else if (field.type === "boolean") {
      data[field.name] = value;
    } else if (value !== undefined) {
      data[field.name] = value;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data,
  };
}
