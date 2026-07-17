import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  Form,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getSessionId } from "~/lib/session.server";
import { findUserByEmail, getProgress, saveAccountProgress } from "~/lib/db.server";
import { hashPassword } from "~/lib/hash.server";
import { WizardSteps } from "~/components/wizard-steps/wizard-steps";

export const useAccountData = routeLoader$((requestEvent) => {
  const sessionId = getSessionId(requestEvent);
  const progress = getProgress(sessionId);
  return {
    email: progress?.email ?? "",
  };
});

export const useAccountAction = routeAction$(
  async (data, requestEvent) => {
    const sessionId = getSessionId(requestEvent);
    const passwordHash = hashPassword(data.password);
    saveAccountProgress(sessionId, { email: data.email, passwordHash });
    throw requestEvent.redirect(303, "/register/profile/");
  },
  zod$((z) =>
    z
      .object({
        email: z
          .string()
          .trim()
          .min(1, "Email is required")
          .email("Please enter a valid email address"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters long")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[0-9]/, "Password must contain at least one digit"),
        confirmPassword: z.string().min(1, "Please confirm your password"),
      })
      .superRefine((val, ctx) => {
        if (val.password !== val.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Passwords do not match",
            path: ["confirmPassword"],
          });
        }
      })
      .superRefine(async (val, ctx) => {
        const existing = findUserByEmail(val.email);
        if (existing) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "An account with this email already exists",
            path: ["email"],
          });
        }
      }),
  ),
);

export default component$(() => {
  const accountData = useAccountData();
  const action = useAccountAction();

  const emailValue =
    (action.formData?.get("email") as string | null) ?? accountData.value.email;

  return (
    <div class="wizard-page">
      <WizardSteps current={1} />
      <div class="wizard-card">
        <h1>Create your account</h1>
        <p class="subtitle">Step 1 of 3 &mdash; Account details</p>

        {action.value?.formErrors && action.value.formErrors.length > 0 && (
          <div class="form-error">{action.value.formErrors.join(" ")}</div>
        )}

        <Form action={action}>
          <div
            class={`field ${action.value?.fieldErrors?.email ? "has-error" : ""}`}
          >
            <label for="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={emailValue}
            />
            {action.value?.fieldErrors?.email && (
              <div class="field-error">{action.value.fieldErrors.email}</div>
            )}
          </div>

          <div
            class={`field ${action.value?.fieldErrors?.password ? "has-error" : ""}`}
          >
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
            />
            {action.value?.fieldErrors?.password && (
              <div class="field-error">
                {action.value.fieldErrors.password}
              </div>
            )}
          </div>

          <div
            class={`field ${action.value?.fieldErrors?.confirmPassword ? "has-error" : ""}`}
          >
            <label for="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
            {action.value?.fieldErrors?.confirmPassword && (
              <div class="field-error">
                {action.value.fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          <button type="submit" class="btn-primary" disabled={action.isRunning}>
            {action.isRunning ? "Please wait..." : "Continue"}
          </button>
        </Form>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Register - Account | Qwik Wizard",
  meta: [
    {
      name: "description",
      content: "Create your account - step 1 of the registration wizard.",
    },
  ],
};
