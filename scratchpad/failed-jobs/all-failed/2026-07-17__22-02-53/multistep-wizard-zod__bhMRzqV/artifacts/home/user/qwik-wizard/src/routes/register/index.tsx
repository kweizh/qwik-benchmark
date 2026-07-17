import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, zod$, Form } from "@builder.io/qwik-city";
import { getUserByEmail, hashPassword } from "../../lib/db.server";
import { getSession, updateSession } from "../../lib/session.server";

export const useAccountLoader = routeLoader$(async ({ cookie }) => {
  const session = getSession(cookie);
  return {
    email: session.email || "",
  };
});

export const useAccountAction = routeAction$(
  async (data, { cookie, redirect }) => {
    // Hash password
    const passwordHash = hashPassword(data.password);

    // Save to session
    updateSession(cookie, {
      email: data.email,
      passwordHash,
    });

    // Redirect to profile step
    throw redirect(303, "/register/profile/");
  },
  zod$((z) =>
    z
      .object({
        email: z
          .string()
          .min(1, "Email is required")
          .email("Invalid email address")
          .refine((email) => {
            const existingUser = getUserByEmail(email);
            return !existingUser;
          }, "Email is already registered"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .regex(/[a-z]/, "Password must contain at least one lowercase letter")
          .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
          .regex(/[0-9]/, "Password must contain at least one digit"),
        confirmPassword: z.string().min(1, "Please confirm your password"),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      })
  )
);

export default component$(() => {
  const loader = useAccountLoader();
  const action = useAccountAction();

  // Determine field values: priority is action.formData (if validation failed) then loader
  const emailValue = (action.formData?.get("email") as string) ?? loader.value.email;
  const passwordValue = (action.formData?.get("password") as string) ?? "";
  const confirmPasswordValue = (action.formData?.get("confirmPassword") as string) ?? "";

  return (
    <div class="container">
      <div class="wizard-header">
        <h1 class="wizard-title">Create Account</h1>
        <p class="wizard-subtitle">Step 1 of 3 — Account details</p>
      </div>

      {/* Progress Indicator */}
      <div class="progress-steps">
        <div class="step-item active">
          <div class="step-circle">1</div>
          <div class="step-label">Account</div>
        </div>
        <div class="step-item">
          <div class="step-circle">2</div>
          <div class="step-label">Profile</div>
        </div>
        <div class="step-item">
          <div class="step-circle">3</div>
          <div class="step-label">Review</div>
        </div>
      </div>

      <div class="form-card">
        <Form action={action} noValidate>
          <div class="form-group">
            <label class="form-label" for="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={emailValue}
              class={`form-input ${action.value?.fieldErrors?.email ? "has-error" : ""}`}
              placeholder="you@example.com"
            />
            {action.value?.fieldErrors?.email && (
              <p class="error-message">{action.value.fieldErrors.email[0]}</p>
            )}
          </div>

          <div class="form-group">
            <label class="form-label" for="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={passwordValue}
              class={`form-input ${action.value?.fieldErrors?.password ? "has-error" : ""}`}
              placeholder="••••••••"
            />
            {action.value?.fieldErrors?.password && (
              <p class="error-message">{action.value.fieldErrors.password[0]}</p>
            )}
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPasswordValue}
              class={`form-input ${action.value?.fieldErrors?.confirmPassword ? "has-error" : ""}`}
              placeholder="••••••••"
            />
            {action.value?.fieldErrors?.confirmPassword && (
              <p class="error-message">{action.value.fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary">
              Continue to Profile
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
});
