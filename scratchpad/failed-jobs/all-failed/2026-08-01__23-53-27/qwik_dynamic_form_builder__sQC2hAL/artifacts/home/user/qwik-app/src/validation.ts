export interface FormField {
  name: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
  data: Record<string, any>;
}

export function validateForm(schema: FormSchema, rawData: Record<string, any>): ValidationResult {
  const errors: Record<string, string> = {};
  const validatedData: Record<string, any> = {};

  for (const field of schema.fields) {
    const value = rawData[field.name];

    // Check boolean field
    if (field.type === "boolean") {
      // Checkbox is true if it's "on", "true", true, 1, "1"
      const isChecked = value === "on" || value === "true" || value === true || value === 1 || value === "1";
      validatedData[field.name] = isChecked;

      if (field.required && !isChecked) {
        errors[field.name] = `${field.name} must be checked`;
      }
      continue;
    }

    // For string and number fields:
    const isEmpty = value === undefined || value === null || String(value).trim() === "";

    if (isEmpty) {
      if (field.required) {
        errors[field.name] = `${field.name} is required`;
      } else {
        validatedData[field.name] = field.type === "number" ? null : "";
      }
      continue;
    }

    if (field.type === "number") {
      const parsedNum = Number(value);
      if (isNaN(parsedNum)) {
        errors[field.name] = `${field.name} must be a valid number`;
      } else {
        if (field.min !== undefined && parsedNum < field.min) {
          errors[field.name] = `${field.name} must be at least ${field.min}`;
        } else if (field.max !== undefined && parsedNum > field.max) {
          errors[field.name] = `${field.name} must be at most ${field.max}`;
        } else {
          validatedData[field.name] = parsedNum;
        }
      }
    } else if (field.type === "string") {
      const strVal = String(value);
      if (field.minLength !== undefined && strVal.length < field.minLength) {
        errors[field.name] = `${field.name} must be at least ${field.minLength} characters`;
      } else if (field.maxLength !== undefined && strVal.length > field.maxLength) {
        errors[field.name] = `${field.name} must be at most ${field.maxLength} characters`;
      } else if (field.pattern !== undefined) {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(strVal)) {
            errors[field.name] = `${field.name} does not match the required pattern`;
          } else {
            validatedData[field.name] = strVal;
          }
        } catch (e) {
          // If regex pattern is invalid in database, log it and pass or fail? Let's fail gracefully or log.
          console.error(`Invalid regex pattern: ${field.pattern}`, e);
          validatedData[field.name] = strVal;
        }
      } else {
        validatedData[field.name] = strVal;
      }
    }
  }

  const success = Object.keys(errors).length === 0;
  return {
    success,
    errors,
    data: success ? validatedData : {},
  };
}
