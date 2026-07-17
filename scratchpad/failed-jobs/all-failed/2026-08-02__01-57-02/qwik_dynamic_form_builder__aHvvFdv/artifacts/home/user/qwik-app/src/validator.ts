export interface FieldSchema {
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
  fields: FieldSchema[];
}

export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
  data: Record<string, any>;
}

export function validateSubmission(schema: FormSchema, body: any): ValidationResult {
  const errors: Record<string, string> = {};
  const validatedData: Record<string, any> = {};

  const payload = body || {};

  for (const field of schema.fields) {
    const { name, type, required, min, max, minLength, maxLength, pattern } = field;
    const rawValue = payload[name];

    if (type === "boolean") {
      // Parse boolean
      let parsedValue = false;
      if (rawValue === true || rawValue === "true" || rawValue === "on") {
        parsedValue = true;
      }

      if (required && !parsedValue) {
        errors[name] = `${name} must be checked`;
      } else {
        validatedData[name] = parsedValue;
      }
    } else if (type === "number") {
      // Parse number
      const isEmpty = rawValue === undefined || rawValue === null || rawValue === "";
      
      if (isEmpty) {
        if (required) {
          errors[name] = `${name} is required`;
        } else {
          validatedData[name] = null;
        }
      } else {
        const parsedValue = Number(rawValue);
        if (isNaN(parsedValue)) {
          errors[name] = `${name} must be a number`;
        } else {
          // Check min/max
          if (min !== undefined && parsedValue < min) {
            errors[name] = `${name} must be at least ${min}`;
          } else if (max !== undefined && parsedValue > max) {
            errors[name] = `${name} must be at most ${max}`;
          } else {
            validatedData[name] = parsedValue;
          }
        }
      }
    } else if (type === "string") {
      // Parse string
      const isEmpty = rawValue === undefined || rawValue === null || rawValue === "";

      if (isEmpty) {
        if (required) {
          errors[name] = `${name} is required`;
        } else {
          validatedData[name] = "";
        }
      } else {
        const strValue = String(rawValue);
        if (minLength !== undefined && strValue.length < minLength) {
          errors[name] = `${name} must be at least ${minLength} characters`;
        } else if (maxLength !== undefined && strValue.length > maxLength) {
          errors[name] = `${name} must be at most ${maxLength} characters`;
        } else if (pattern !== undefined) {
          try {
            const regex = new RegExp(pattern);
            if (!regex.test(strValue)) {
              errors[name] = `${name} is invalid`;
            } else {
              validatedData[name] = strValue;
            }
          } catch (e) {
            // If pattern is invalid regex, we might just skip or handle
            validatedData[name] = strValue;
          }
        } else {
          validatedData[name] = strValue;
        }
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
