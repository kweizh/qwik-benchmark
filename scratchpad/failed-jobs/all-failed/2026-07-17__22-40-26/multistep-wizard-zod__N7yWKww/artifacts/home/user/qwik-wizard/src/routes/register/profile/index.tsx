import { component$ } from "@builder.io/qwik";
import {
  Form,
  Link,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { readSession, writeSession } from "~/lib/session";
import { zodWithValues$ } from "~/lib/zod-with-values";

export const useProfileData = routeLoader$((ev) => {
  const data = readSession(ev);
  if (!data.account) {
    throw ev.redirect(303, "/register/");
  }
  return {
    fullName: data.profile?.fullName ?? "",
    age: data.profile?.age ?? ("" as unknown as number),
    country: data.profile?.country ?? "",
  };
});

interface ProfileActionFailure {
  failed: true;
  fieldErrors: Record<string, string>;
  formErrors: string[];
  values: Record<string, unknown>;
}

export const useProfileAction = routeAction$(
  async (values, ev) => {
    const data = readSession(ev);
    if (!data.account) {
      throw ev.redirect(303, "/register/");
    }

    writeSession(ev, {
      profile: {
        fullName: values.fullName.trim(),
        age: values.age,
        country: values.country.trim(),
      },
    });

    throw ev.redirect(303, "/register/review/");
  },
  zodWithValues$((zod) =>
    zod.object({
      fullName: zod
        .string()
        .min(2, "Full name must be at least 2 characters")
        .transform((s) => s.trim()),
      age: zod.coerce
        .number({ invalid_type_error: "Age must be a number" })
        .int("Age must be a whole number")
        .min(18, "You must be at least 18 years old"),
      country: zod
        .string()
        .min(1, "Country is required")
        .transform((s) => s.trim()),
    }),
  ),
);

export default component$(() => {
  const loader = useProfileData();
  const action = useProfileAction();

  const failure = action.value as
    | (ProfileActionFailure & { failed?: true })
    | undefined;
  const fieldErrors = failure?.fieldErrors ?? {};
  const formErrors = failure?.formErrors ?? [];
  const submitted = failure?.values;

  const fullName =
    (submitted?.fullName as string | undefined) ?? loader.value.fullName;
  const age =
    (submitted?.age as number | string | undefined) ?? loader.value.age;
  const country =
    (submitted?.country as string | undefined) ?? loader.value.country;

  return (
    <main>
      <div class="steps" aria-label="Wizard progress">
        <span>
          <Link href="/register/">1. Account</Link>
        </span>
        <span class="active">2. Profile</span>
        <span>3. Review</span>
      </div>
      <h1>About you</h1>
      <p>Step 2 of 3. Tell us a little about yourself.</p>

      {(Object.keys(fieldErrors).length > 0 || formErrors.length > 0) && (
        <div class="summary-error" role="alert">
          Please fix the highlighted fields and try again.
          {formErrors.length > 0 && (
            <ul>
              {formErrors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Form action={action}>
        <label>
          Full name
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            required
            value={fullName}
            aria-invalid={fieldErrors.fullName ? "true" : "false"}
          />
          {fieldErrors.fullName && (
            <span class="field-error">{fieldErrors.fullName}</span>
          )}
        </label>

        <label>
          Age
          <input
            type="number"
            name="age"
            inputMode="numeric"
            min={18}
            required
            value={age as string | number}
            aria-invalid={fieldErrors.age ? "true" : "false"}
          />
          {fieldErrors.age && (
            <span class="field-error">{fieldErrors.age}</span>
          )}
        </label>

        <label>
          Country
          <input
            type="text"
            name="country"
            autoComplete="country-name"
            required
            value={country}
            aria-invalid={fieldErrors.country ? "true" : "false"}
          />
          {fieldErrors.country && (
            <span class="field-error">{fieldErrors.country}</span>
          )}
        </label>

        <div class="form-actions">
          <Link href="/register/" class="secondary">
            ← Back
          </Link>
          <button type="submit">Continue → Review</button>
        </div>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Register · Profile",
};