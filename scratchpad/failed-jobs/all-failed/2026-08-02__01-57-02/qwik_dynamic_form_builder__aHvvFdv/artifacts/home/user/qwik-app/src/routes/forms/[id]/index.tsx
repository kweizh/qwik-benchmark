import { component$, $, useStore, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import db from "../../../db";

export const useFormSchema = routeLoader$(async (requestEvent) => {
  const { params, error } = requestEvent;
  const { id } = params;

  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(id) as { schema: string } | undefined;
  } catch (err) {
    throw error(500, "Database error");
  }

  if (!row) {
    throw error(404, "Form not found");
  }

  try {
    return {
      id,
      schema: JSON.parse(row.schema) as {
        fields: Array<{
          name: string;
          type: "string" | "number" | "boolean";
          required?: boolean;
          min?: number;
          max?: number;
          minLength?: number;
          maxLength?: number;
          pattern?: string;
        }>;
      },
    };
  } catch (err) {
    throw error(500, "Invalid form schema in database");
  }
});

export default component$(() => {
  const formSchema = useFormSchema();
  const errors = useStore<Record<string, string>>({});
  const successMessage = useSignal<string | null>(null);

  const handleSubmit = $(async (event: Event) => {
    event.preventDefault();

    // Clear previous errors/success message
    for (const key of Object.keys(errors)) {
      delete errors[key];
    }
    successMessage.value = null;

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    // Convert FormData to URLSearchParams for application/x-www-form-urlencoded
    const body = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      body.append(key, value as string);
    }

    // Since unchecked checkboxes are not submitted by default, we don't need to append them.
    // The server handles missing boolean fields as false.

    try {
      const response = await fetch(`/forms/${formSchema.value.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.errors) {
          for (const [key, val] of Object.entries(result.errors)) {
            errors[key] = val as string;
          }
        } else {
          errors["_form"] = result.error || "An error occurred during submission.";
        }
      } else {
        successMessage.value = `Submission successful! Submission ID: ${result.submissionId}`;
        form.reset();
      }
    } catch (err) {
      errors["_form"] = "Failed to submit form.";
    }
  });

  const { id, schema } = formSchema.value;

  return (
    <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "20px" }}>Dynamic Form: {id}</h1>

      {successMessage.value && (
        <div style={{ padding: "15px", backgroundColor: "#d4edda", color: "#155724", borderRadius: "4px", marginBottom: "20px" }}>
          {successMessage.value}
        </div>
      )}

      {errors["_form"] && (
        <div style={{ padding: "15px", backgroundColor: "#f8d7da", color: "#721c24", borderRadius: "4px", marginBottom: "20px" }}>
          {errors["_form"]}
        </div>
      )}

      <form method="POST" action={`/forms/${id}/submit`} onSubmit$={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {schema.fields.map((field) => (
          <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label for={field.name} style={{ fontWeight: "bold" }}>
              {field.name}
              {field.required && <span style={{ color: "red" }}> *</span>}
            </label>

            {field.type === "string" && (
              <input
                type="text"
                id={field.name}
                name={field.name}
                style={{ padding: "8px", borderRadius: "4px", border: errors[field.name] ? "1px solid red" : "1px solid #ccc" }}
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                id={field.name}
                name={field.name}
                style={{ padding: "8px", borderRadius: "4px", border: errors[field.name] ? "1px solid red" : "1px solid #ccc" }}
              />
            )}

            {field.type === "boolean" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id={field.name}
                  name={field.name}
                />
                <span>Enable {field.name}</span>
              </div>
            )}

            {errors[field.name] && (
              <span style={{ color: "red", fontSize: "0.85rem", marginTop: "2px" }}>
                {errors[field.name]}
              </span>
            )}
          </div>
        ))}

        <button
          type="submit"
          style={{
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: "10px"
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
});
