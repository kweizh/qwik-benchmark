import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { getFormSchema, type FormSchemaField } from "~/lib/db";

export const useFormSchema = routeLoader$(({ params, status }) => {
  const schema = getFormSchema(params.id);
  if (!schema) {
    status(404);
    return null;
  }
  return schema;
});

export const useValidationErrors = routeLoader$(({ query }) => {
  const errorsParam = query.get("errors");
  if (!errorsParam) return null;
  try {
    return JSON.parse(errorsParam);
  } catch {
    return null;
  }
});

export const useSubmittedValues = routeLoader$(({ query }) => {
  const valuesParam = query.get("values");
  if (!valuesParam) return null;
  try {
    return JSON.parse(valuesParam);
  } catch {
    return null;
  }
});

export default component$(() => {
  const schema = useFormSchema();
  const errors = useValidationErrors();
  const submittedValues = useSubmittedValues();
  const location = useLocation();

  if (!schema.value) {
    return (
      <div>
        <h1>Form Not Found</h1>
        <p>The requested form does not exist.</p>
      </div>
    );
  }

  const errorMap = (errors.value || {}) as Record<string, string>;
  const valueMap = (submittedValues.value || {}) as Record<string, string>;

  return (
    <div>
      <h1>Dynamic Form</h1>
      <form method="POST" action={`/forms/${location.params.id}/submit`}>
        {schema.value.fields.map((field: FormSchemaField) => {
          const fieldError = errorMap[field.name];
          const fieldValue = valueMap[field.name] ?? "";

          return (
            <div key={field.name} style={{ marginBottom: "16px" }}>
              <label for={field.name}>
                {field.name}
                {field.required && <span style={{ color: "red" }}> *</span>}
              </label>

              {field.type === "boolean" ? (
                <div>
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    value="on"
                    checked={fieldValue === "on"}
                  />
                </div>
              ) : field.type === "number" ? (
                <div>
                  <input
                    type="number"
                    id={field.name}
                    name={field.name}
                    value={fieldValue}
                    min={field.min}
                    max={field.max}
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    id={field.name}
                    name={field.name}
                    value={fieldValue}
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    pattern={field.pattern}
                  />
                </div>
              )}

              {fieldError && (
                <div style={{ color: "red", fontSize: "14px", marginTop: "4px" }}>
                  {fieldError}
                </div>
              )}
            </div>
          );
        })}
        <button type="submit">Submit</button>
      </form>
    </div>
  );
});
