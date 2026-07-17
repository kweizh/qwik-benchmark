import { component$, useStore, $ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import db from "~/lib/db";

export const useFormSchema = routeLoader$(async (requestEvent) => {
  const { params } = requestEvent;
  const formId = params.id;

  let row: { schema: string } | undefined;
  try {
    row = db.prepare("SELECT schema FROM forms WHERE id = ?").get(formId) as
      | { schema: string }
      | undefined;
  } catch (err: any) {
    throw requestEvent.error(500, "Database error: " + err.message);
  }

  if (!row) {
    throw requestEvent.error(404, "Form not found");
  }

  try {
    const schema = JSON.parse(row.schema);
    return {
      id: formId,
      schema,
    };
  } catch {
    throw requestEvent.error(500, "Invalid form schema in database");
  }
});

export default component$(() => {
  const formSignal = useFormSchema();
  const errors = useStore<Record<string, string>>({});
  const successMessage = useStore({ value: "" });

  const handleSubmit = $(async (event: Event) => {
    // Clear previous errors/messages
    for (const key in errors) {
      delete errors[key];
    }
    successMessage.value = "";

    const formElement = event.target as HTMLFormElement;
    const formData = new FormData(formElement);

    const body = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      body.append(key, value as string);
    }

    try {
      const response = await fetch(`/forms/${formSignal.value.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        if (result.errors) {
          Object.assign(errors, result.errors);
        } else if (result.error) {
          errors["_general"] = result.error;
        }
      } else {
        successMessage.value = `Form submitted successfully! Submission ID: ${result.submissionId}`;
        formElement.reset();
      }
    } catch (err: any) {
      errors["_general"] = "An unexpected error occurred: " + err.message;
    }
  });

  const fields = formSignal.value.schema.fields || [];

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "sans-serif",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
        Dynamic Form: {formSignal.value.id}
      </h1>

      {successMessage.value && (
        <div
          style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "15px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #c3e6cb",
          }}
        >
          {successMessage.value}
        </div>
      )}

      {errors["_general"] && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "15px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #f5c6cb",
          }}
        >
          {errors["_general"]}
        </div>
      )}

      <form
        method="POST"
        action={`/forms/${formSignal.value.id}/submit`}
        preventdefault:submit
        onSubmit$={handleSubmit}
        noValidate
      >
        {fields.map((field: any) => {
          return (
            <div key={field.name} style={{ marginBottom: "20px" }}>
              {field.type !== "boolean" ? (
                <>
                  <label
                    for={field.name}
                    style={{
                      display: "block",
                      fontWeight: "bold",
                      marginBottom: "5px",
                    }}
                  >
                    {field.name}{" "}
                    {field.required && <span style={{ color: "red" }}>*</span>}
                  </label>
                  {field.type === "string" && (
                    <input
                      type="text"
                      id={field.name}
                      name={field.name}
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "16px",
                        border: errors[field.name]
                          ? "1px solid red"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                  {field.type === "number" && (
                    <input
                      type="number"
                      id={field.name}
                      name={field.name}
                      style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "16px",
                        border: errors[field.name]
                          ? "1px solid red"
                          : "1px solid #ccc",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id={field.name}
                    name={field.name}
                    style={{
                      marginRight: "10px",
                      transform: "scale(1.2)",
                    }}
                  />
                  <label for={field.name} style={{ fontWeight: "bold" }}>
                    {field.name}{" "}
                    {field.required && <span style={{ color: "red" }}>*</span>}
                  </label>
                </div>
              )}
              {errors[field.name] && (
                <div
                  style={{ color: "red", fontSize: "14px", marginTop: "5px" }}
                  class="error-message"
                >
                  {errors[field.name]}
                </div>
              )}
            </div>
          );
        })}
        <button
          type="submit"
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "12px 20px",
            border: "none",
            borderRadius: "4px",
            fontSize: "16px",
            cursor: "pointer",
            width: "100%",
            fontWeight: "bold",
          }}
        >
          Submit
        </button>
      </form>
    </div>
  );
});
