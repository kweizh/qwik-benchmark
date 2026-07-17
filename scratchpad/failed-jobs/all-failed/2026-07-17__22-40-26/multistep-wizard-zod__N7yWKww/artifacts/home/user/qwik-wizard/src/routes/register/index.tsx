import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { findUserByEmail, getDb } from "~/lib/db.server";
import { hashPassword, readSession, writeSession } from "~/lib/session";
import { zodWithValues$ } from "~/lib/zod-with-values";

export const useWizardData = routeLoader$((ev) => {
  // Ensures the SQLite file and `users` table exist before any query runs.
  getDb();
  const data = readSession(ev);
  return {
    email: data.account?.email ?? "",
  };
});

interface AccountActionFailure {
  failed: true;
  fieldErrors: Record<string, string>;
  formErrors: string[];
  values: Record<string, unknown>;
}

export const useAccountAction = routeAction$(
  async (values, ev) => {
    const normalisedEmail = values.email.trim().toLowerCase();

    // Uniqueness enforced against the SQLite database. This intentionally lives
    // in the handler (rather than the validator) because the rule depends on
    // side-effecting I/O rather than just the request payload.
    const existing = findUserByEmail(normalisedEmail);
    if (existing) {
      return ev.fail<AccountActionFailure>(400, {
        failed: true,
        formErrors: [],
        fieldErrors: {
          email: "An account with this email already exists.",
        },
        values: { email: values.email },
      });
    }

    writeSession(ev, {
      account: {
        email: normalisedEmail,
        passwordHash: hashPassword(values.password),
      },
    });

    throw ev.redirect(303, "/register/profile/");
  },
  zodWithValues$((zod) =>
    zod
      .object({
        email: zod
          .string()
          .min(1, "Email is required")
          .email("Please enter a valid email address"),
        password: zod
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[a-z]/, "Password must contain a lowercase letter")
          .regex(/[A-Z]/, "Password must contain an uppercase letter")
          .regex(/[0-9]/, "Password must contain a digit"),
        confirmPassword: zod
          .string()
          .min(1, "Please confirm your password"),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }),
  ),
);

export default component$(() => {
  const wizardData = useWizardData();
  const action = useAccountAction();

  // The action's failure value carries the submitted values; otherwise we fall
  // back to whatever was previously persisted in the server-side session.
  const failure = action.value as
    | (AccountActionFailure & { failed?: true })
    | undefined;
  const submitted = failure?.values;
  const fieldErrors = failure?.fieldErrors ?? {};
  const formErrors = failure?.formErrors ?? [];

  const email =
    (submitted?.email as string | undefined) ?? wizardData.value.email ?? "";
  // Never pre-fill passwords — the browser and form autofill get those from
  // the user.
  const password = "";
  const confirmPassword = "";

  return (
    <main>
      <div class="steps" aria-label="Wizard progress">
        <span class="active">1. Account</span>
        <span>2. Profile</span>
        <span>3. Review</span>
      </div>
      <h1>Create your account</h1>
      <p>
        Step 1 of 3. We'll save your progress on the server so you can come back
        later.
      </p>

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
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            aria-invalid={fieldErrors.email ? "true" : "false"}
          />
          {fieldErrors.email && (
            <span class="field-error">{fieldErrors.email}</span>
          )}
        </label>

        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            aria-invalid={fieldErrors.password ? "true" : "false"}
          />
          {fieldErrors.password && (
            <span class="field-error">{fieldErrors.password}</span>
          )}
        </label>

        <label>
          Confirm password
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            aria-invalid={fieldErrors.confirmPassword ? "true" : "false"}
          />
          {fieldErrors.confirmPassword && (
            <span class="field-error">{fieldErrors.confirmPassword}</span>
          )}
        </label>

        <div class="form-actions">
          <span />
          <button type="submit">Continue → Profile</button>
        </div>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Register · Account",
};