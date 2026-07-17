import { $, component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getFormById, type FormField } from "~/lib/db";

export const useFormLoader = routeLoader$(async (requestEvent) => {
  const form = getFormById(requestEvent.params.id);

  if (!form) {
    throw requestEvent.error(404, "Form not found");
  }

  return form;
});

export default component$(() => {
  const form = useFormLoader();
  const errors = useSignal<Record<string, string>>({});
  const submitting = useSignal(false);
  const submissionId = useSignal<number | null>(null);

  const handleSubmit = $(async (event: SubmitEvent, formEl: HTMLFormElement) => {
    submitting.value = true;
    submissionId.value = null;

    const formData = new FormData(formEl);
    const payload: Record<string, unknown> = {};

    for (const field of form.value.schema.fields) {
      if (field.type === "boolean") {
        payload[field.name] = formData.has(field.name);
      } else {
        payload[field.name] = formData.get(field.name) ?? "";
      }
    }

    try {
      const response = await fetch(formEl.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        success: boolean;
        errors?: Record<string, string>;
        submissionId?: number;
      };

      if (result.success) {
        errors.value = {};
        submissionId.value = result.submissionId ?? null;
        formEl.reset();
      } else {
        errors.value = result.errors ?? {};
      }
    } finally {
      submitting.value = false;
    }
  });

  return (
    <div>
      <h1>{form.value.id}</h1>

      {submissionId.value !== null && (
        <p data-testid="submit-success">
          Submission successful! ID: {submissionId.value}
        </p>
      )}

      <form
        method="POST"
        action={`/forms/${form.value.id}/submit`}
        preventdefault:submit
        onSubmit$={handleSubmit}
      >
        {form.value.schema.fields.map((field: FormField) => (
          <div class="form-field" key={field.name}>
            <label for={field.name}>{field.name}</label>

            {field.type === "string" && (
              <input type="text" id={field.name} name={field.name} />
            )}
            {field.type === "number" && (
              <input type="number" id={field.name} name={field.name} />
            )}
            {field.type === "boolean" && (
              <input type="checkbox" id={field.name} name={field.name} />
            )}

            {errors.value[field.name] && (
              <span class="field-error" data-testid={`error-${field.name}`}>
                {errors.value[field.name]}
              </span>
            )}
          </div>
        ))}

        <button type="submit" disabled={submitting.value}>
          Submit
        </button>
      </form>
    </div>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const form = resolveValue(useFormLoader);

  return {
    title: `Form: ${form.id}`,
  };
};
