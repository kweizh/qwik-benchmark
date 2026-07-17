import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, zod$, Form } from "@builder.io/qwik-city";
import { getSession, updateSession } from "../../../lib/session.server";

export const useProfileLoader = routeLoader$(async ({ cookie, redirect }) => {
  const session = getSession(cookie);
  if (!session.email || !session.passwordHash) {
    throw redirect(302, "/register/");
  }
  return {
    fullName: session.fullName || "",
    age: session.age !== undefined ? String(session.age) : "",
    country: session.country || "",
  };
});

export const useProfileAction = routeAction$(
  async (data, { cookie, redirect }) => {
    updateSession(cookie, {
      fullName: data.fullName,
      age: data.age,
      country: data.country,
    });
    throw redirect(303, "/register/review/");
  },
  zod$((z) =>
    z.object({
      fullName: z
        .string()
        .min(1, "Full name is required")
        .min(2, "Full name must be at least 2 characters"),
      age: z
        .preprocess((val) => {
          if (val === undefined || val === null || val === "") {
            return undefined;
          }
          const parsed = Number(val);
          return Number.isNaN(parsed) ? val : parsed;
        }, z.number({ invalid_type_error: "Age must be a valid number" }).int("Age must be an integer").min(18, "You must be at least 18 years old")),
      country: z.string().min(1, "Country is required"),
    })
  )
);

export default component$(() => {
  const loader = useProfileLoader();
  const action = useProfileAction();

  // Determine field values: priority is action.formData (if validation failed) then loader
  const fullNameValue = (action.formData?.get("fullName") as string) ?? loader.value.fullName;
  const ageValue = (action.formData?.get("age") as string) ?? loader.value.age;
  const countryValue = (action.formData?.get("country") as string) ?? loader.value.country;

  return (
    <div class="container">
      <div class="wizard-header">
        <h1 class="wizard-title">Profile Information</h1>
        <p class="wizard-subtitle">Step 2 of 3 — Tell us about yourself</p>
      </div>

      {/* Progress Indicator */}
      <div class="progress-steps">
        <div class="step-item completed">
          <div class="step-circle">1</div>
          <div class="step-label">Account</div>
        </div>
        <div class="step-item active">
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
            <label class="form-label" for="fullName">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={fullNameValue}
              class={`form-input ${action.value?.fieldErrors?.fullName ? "has-error" : ""}`}
              placeholder="John Doe"
            />
            {action.value?.fieldErrors?.fullName && (
              <p class="error-message">{action.value.fieldErrors.fullName[0]}</p>
            )}
          </div>

          <div class="form-group">
            <label class="form-label" for="age">
              Age
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={ageValue}
              class={`form-input ${action.value?.fieldErrors?.age ? "has-error" : ""}`}
              placeholder="18"
              min="1"
            />
            {action.value?.fieldErrors?.age && (
              <p class="error-message">{action.value.fieldErrors.age[0]}</p>
            )}
          </div>

          <div class="form-group">
            <label class="form-label" for="country">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={countryValue}
              class={`form-input ${action.value?.fieldErrors?.country ? "has-error" : ""}`}
              placeholder="United States"
            />
            {action.value?.fieldErrors?.country && (
              <p class="error-message">{action.value.fieldErrors.country[0]}</p>
            )}
          </div>

          <div class="button-group">
            <a href="/register/" class="btn btn-secondary">
              Back to Account
            </a>
            <button type="submit" class="btn btn-primary">
              Continue to Review
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
});
