import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getDb } from "../../../db";

export const useFormSchema = routeLoader$(async (requestEvent) => {
  const formId = requestEvent.params.id;
  const db = getDb();
  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(formId) as { schema: string } | undefined;
  } catch {
    throw requestEvent.error(500, "Database error");
  }

  if (!row) {
    throw requestEvent.error(404, "Form not found");
  }

  try {
    return {
      id: formId,
      schema: JSON.parse(row.schema),
    };
  } catch {
    throw requestEvent.error(500, "Invalid schema stored in database");
  }
});

export default component$(() => {
  const formLoader = useFormSchema();
  const errorsSig = useSignal<Record<string, string>>({});
  const successSig = useSignal<boolean>(false);
  const submissionIdSig = useSignal<number | null>(null);
  const submittingSig = useSignal<boolean>(false);

  const formId = formLoader.value.id;
  const fields = formLoader.value.schema.fields || [];

  return (
    <div style={{ maxWidth: "500px", margin: "2rem auto", padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Form: {formId}</h1>

      {successSig.value && (
        <div style={{
          backgroundColor: "#d4edda",
          color: "#155724",
          padding: "1rem",
          borderRadius: "4px",
          marginBottom: "1.5rem",
          border: "1px solid #c3e6cb"
        }}>
          <strong>Success!</strong> Form submitted successfully.
          {submissionIdSig.value !== null && (
            <div>Submission ID: {submissionIdSig.value}</div>
          )}
        </div>
      )}

      {Object.keys(errorsSig.value).length > 0 && (
        <div style={{
          backgroundColor: "#f8d7da",
          color: "#721c24",
          padding: "1rem",
          borderRadius: "4px",
          marginBottom: "1.5rem",
          border: "1px solid #f5c6cb"
        }}>
          <strong>Please fix the errors below.</strong>
        </div>
      )}

      <form
        method="POST"
        action={`/forms/${formId}/submit`}
        preventdefault:submit
        onSubmit$={async (event, currentTarget) => {
          submittingSig.value = true;
          errorsSig.value = {};
          successSig.value = false;
          submissionIdSig.value = null;

          const formData = new FormData(currentTarget);
          const params = new URLSearchParams();
          for (const [key, value] of formData.entries()) {
            params.append(key, value as string);
          }

          try {
            const response = await fetch(`/forms/${formId}/submit`, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
              },
              body: params.toString()
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              errorsSig.value = result.errors || { form: "Submission failed" };
              successSig.value = false;
            } else {
              successSig.value = true;
              submissionIdSig.value = result.submissionId;
              // Reset the form values
              currentTarget.reset();
            }
          } catch {
            errorsSig.value = { form: "An unexpected error occurred. Please try again." };
          } finally {
            submittingSig.value = false;
          }
        }}
      >
        {fields.map((field: any) => {
          const hasError = !!errorsSig.value[field.name];
          const errorMsg = errorsSig.value[field.name];

          return (
            <div key={field.name} style={{ marginBottom: "1.25rem" }}>
              {field.type === "boolean" ? (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    style={{ marginRight: "0.5rem", cursor: "pointer" }}
                  />
                  <label for={field.name} style={{ fontWeight: "500", cursor: "pointer" }}>
                    {field.name} {field.required && <span style={{ color: "red" }}>*</span>}
                  </label>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <label for={field.name} style={{ fontWeight: "500", marginBottom: "0.25rem" }}>
                    {field.name} {field.required && <span style={{ color: "red" }}>*</span>}
                  </label>
                  {field.type === "number" ? (
                    <input
                      type="number"
                      id={field.name}
                      name={field.name}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: hasError ? "1px solid red" : "1px solid #ccc",
                        fontSize: "1rem"
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      id={field.name}
                      name={field.name}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: hasError ? "1px solid red" : "1px solid #ccc",
                        fontSize: "1rem"
                      }}
                    />
                  )}
                </div>
              )}

              {hasError && (
                <div style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {errorMsg}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={submittingSig.value}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "0.75rem 1.5rem",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor: "pointer",
            width: "100%",
            marginTop: "1rem"
          }}
        >
          {submittingSig.value ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
});
