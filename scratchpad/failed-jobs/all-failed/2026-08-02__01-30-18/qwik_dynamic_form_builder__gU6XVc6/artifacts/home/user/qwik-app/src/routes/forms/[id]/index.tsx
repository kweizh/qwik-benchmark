import { component$, useStore, useSignal, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { getFormById, type FormSchema } from "~/lib/db";

export const useFormLoader = routeLoader$(async (event) => {
  const { id } = event.params;
  const formRow = getFormById(id);
  if (!formRow) {
    event.status(404);
    return null;
  }
  return {
    id: formRow.id,
    schema: JSON.parse(formRow.schema) as FormSchema,
  };
});

export default component$((props: { id?: string }) => {
  const formSignal = useFormLoader();

  if (!formSignal.value) {
    return (
      <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1 style={{ color: "#d9534f" }}>404 Not Found</h1>
        <p>The requested form does not exist.</p>
      </div>
    );
  }

  const { id, schema } = formSignal.value;
  const formValues = useStore<Record<string, any>>({});
  const errors = useStore<Record<string, string>>({});
  const submissionId = useSignal<number | null>(null);
  const generalError = useSignal<string | null>(null);

  const handleSubmit = $(async (e: Event) => {
    e.preventDefault();
    submissionId.value = null;
    generalError.value = null;

    // Clear previous errors
    for (const key of Object.keys(errors)) {
      delete errors[key];
    }

    const formElement = e.target as HTMLFormElement;
    const formData = new FormData(formElement);

    // Build the payload
    const payload: Record<string, any> = {};
    for (const field of schema.fields) {
      if (field.type === "boolean") {
        payload[field.name] = formData.has(field.name);
      } else if (field.type === "number") {
        const val = formData.get(field.name);
        if (val === null || val === "") {
          payload[field.name] = null;
        } else {
          payload[field.name] = Number(val);
        }
      } else {
        payload[field.name] = formData.get(field.name);
      }
    }

    try {
      const response = await fetch(`/forms/${id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.status === 200 || response.status === 201) {
        submissionId.value = result.submissionId;
        formElement.reset();
        // Clear stored form values
        for (const key of Object.keys(formValues)) {
          delete formValues[key];
        }
      } else if (response.status === 400) {
        if (result.errors) {
          for (const [key, msg] of Object.entries(result.errors)) {
            errors[key] = msg as string;
          }
        } else {
          generalError.value = result.message || "Validation failed";
        }
      } else {
        generalError.value = result.message || "An error occurred on the server";
      }
    } catch (err: any) {
      generalError.value = err.message || "Network error. Please try again.";
    }
  });

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif", border: "1px solid #ccc", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <h2 style={{ borderBottom: "2px solid #0070f3", paddingBottom: "10px", color: "#333" }}>Form: {id}</h2>
      
      {submissionId.value !== null && (
        <div class="success-message" style={{ backgroundColor: "#d4edda", color: "#155724", padding: "12px", borderRadius: "4px", marginBottom: "20px", border: "1px solid #c3e6cb" }}>
          Submission successful! Submission ID: <strong>{submissionId.value}</strong>
        </div>
      )}

      {generalError.value && (
        <div class="error-message" style={{ backgroundColor: "#f8d7da", color: "#721c24", padding: "12px", borderRadius: "4px", marginBottom: "20px", border: "1px solid #f5c6cb" }}>
          {generalError.value}
        </div>
      )}

      <form method="POST" action={`/forms/${id}/submit`} onSubmit$={handleSubmit} noValidate>
        {schema.fields.map((field) => {
          const fieldId = `field-${field.name}`;
          return (
            <div key={field.name} class="form-group" style={{ marginBottom: "20px" }}>
              <label htmlFor={fieldId} style={{ display: "block", fontWeight: "bold", marginBottom: "6px", color: "#555" }}>
                {field.name} {field.required && <span style={{ color: "#d9534f" }}>*</span>}
              </label>

              {field.type === "string" && (
                <input
                  type="text"
                  id={fieldId}
                  name={field.name}
                  value={formValues[field.name] || ""}
                  onInput$={(e, currentTarget) => {
                    formValues[field.name] = currentTarget.value;
                  }}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: errors[field.name] ? "1px solid #d9534f" : "1px solid #ccc", boxSizing: "border-box", fontSize: "16px" }}
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  id={fieldId}
                  name={field.name}
                  value={formValues[field.name] === undefined ? "" : formValues[field.name]}
                  onInput$={(e, currentTarget) => {
                    formValues[field.name] = currentTarget.value;
                  }}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: errors[field.name] ? "1px solid #d9534f" : "1px solid #ccc", boxSizing: "border-box", fontSize: "16px" }}
                />
              )}

              {field.type === "boolean" && (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id={fieldId}
                    name={field.name}
                    checked={!!formValues[field.name]}
                    onChange$={(e, currentTarget) => {
                      formValues[field.name] = currentTarget.checked;
                    }}
                    style={{ marginRight: "10px", transform: "scale(1.2)" }}
                  />
                  <span style={{ fontSize: "14px", color: "#666" }}>Enable {field.name}</span>
                </div>
              )}

              {errors[field.name] && (
                <div class="field-error" style={{ color: "#d9534f", fontSize: "14px", marginTop: "6px", fontWeight: "500" }}>
                  {errors[field.name]}
                </div>
              )}
            </div>
          );
        })}

        <button type="submit" style={{ backgroundColor: "#0070f3", color: "#fff", padding: "12px 24px", border: "none", borderRadius: "4px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", width: "100%", transition: "background-color 0.2s" }} onMouseOver$={(e, currentTarget) => { currentTarget.style.backgroundColor = "#0056b3"; }} onMouseOut$={(e, currentTarget) => { currentTarget.style.backgroundColor = "#0070f3"; }}>
          Submit
        </button>
      </form>
    </div>
  );
});
