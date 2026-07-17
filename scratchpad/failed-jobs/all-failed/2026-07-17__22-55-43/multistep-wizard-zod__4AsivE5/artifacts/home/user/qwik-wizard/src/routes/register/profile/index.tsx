import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  zod$,
  Form,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getSessionId } from "~/lib/session.server";
import { getProgress, saveProfileProgress } from "~/lib/db.server";
import { WizardSteps } from "~/components/wizard-steps/wizard-steps";

export const useProfileData = routeLoader$((requestEvent) => {
  const sessionId = getSessionId(requestEvent);
  const progress = getProgress(sessionId);

  // Can't fill in the profile step until the account step has been completed.
  if (!progress?.email) {
    throw requestEvent.redirect(303, "/register/");
  }

  return {
    fullName: progress.full_name ?? "",
    age: progress.age ?? "",
    country: progress.country ?? "",
  };
});

export const useProfileAction = routeAction$(
  async (data, requestEvent) => {
    const sessionId = getSessionId(requestEvent);

    // Guard against skipping ahead directly to this step's action.
    const progress = getProgress(sessionId);
    if (!progress?.email) {
      throw requestEvent.redirect(303, "/register/");
    }

    saveProfileProgress(sessionId, data);
    throw requestEvent.redirect(303, "/register/review/");
  },
  zod$((z) => ({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters long"),
    age: z.coerce
      .number({ invalid_type_error: "Age must be a number" })
      .int("Age must be a whole number")
      .min(18, "You must be at least 18 years old"),
    country: z.string().trim().min(1, "Country is required"),
  })),
);

export default component$(() => {
  const profileData = useProfileData();
  const action = useProfileAction();

  const fullNameValue =
    (action.formData?.get("fullName") as string | null) ??
    profileData.value.fullName;
  const ageValue =
    (action.formData?.get("age") as string | null) ??
    String(profileData.value.age ?? "");
  const countryValue =
    (action.formData?.get("country") as string | null) ??
    profileData.value.country;

  return (
    <div class="wizard-page">
      <WizardSteps current={2} />
      <div class="wizard-card">
        <h1>Tell us about yourself</h1>
        <p class="subtitle">Step 2 of 3 &mdash; Profile details</p>

        {action.value?.formErrors && action.value.formErrors.length > 0 && (
          <div class="form-error">{action.value.formErrors.join(" ")}</div>
        )}

        <Form action={action}>
          <div
            class={`field ${action.value?.fieldErrors?.fullName ? "has-error" : ""}`}
          >
            <label for="fullName">Full name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullNameValue}
            />
            {action.value?.fieldErrors?.fullName && (
              <div class="field-error">
                {action.value.fieldErrors.fullName}
              </div>
            )}
          </div>

          <div
            class={`field ${action.value?.fieldErrors?.age ? "has-error" : ""}`}
          >
            <label for="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              min="0"
              value={ageValue}
            />
            {action.value?.fieldErrors?.age && (
              <div class="field-error">{action.value.fieldErrors.age}</div>
            )}
          </div>

          <div
            class={`field ${action.value?.fieldErrors?.country ? "has-error" : ""}`}
          >
            <label for="country">Country</label>
            <input
              id="country"
              name="country"
              type="text"
              autoComplete="country-name"
              value={countryValue}
            />
            {action.value?.fieldErrors?.country && (
              <div class="field-error">
                {action.value.fieldErrors.country}
              </div>
            )}
          </div>

          <button type="submit" class="btn-primary" disabled={action.isRunning}>
            {action.isRunning ? "Please wait..." : "Continue"}
          </button>
        </Form>

        <p style="margin-top: 1rem; text-align: center;">
          <a class="link-muted" href="/register/">
            &larr; Back to account details
          </a>
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Register - Profile | Qwik Wizard",
  meta: [
    {
      name: "description",
      content: "Tell us about yourself - step 2 of the registration wizard.",
    },
  ],
};
