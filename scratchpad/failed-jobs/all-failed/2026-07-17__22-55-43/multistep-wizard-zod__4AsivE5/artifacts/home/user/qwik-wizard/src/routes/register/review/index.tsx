import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, type DocumentHead } from "@builder.io/qwik-city";
import { getSessionId } from "~/lib/session.server";
import {
  clearProgress,
  findUserByEmail,
  getProgress,
  insertUser,
} from "~/lib/db.server";
import { WizardSteps } from "~/components/wizard-steps/wizard-steps";

export const useReviewData = routeLoader$((requestEvent) => {
  const sessionId = getSessionId(requestEvent);
  const progress = getProgress(sessionId);

  if (!progress?.email || !progress.password_hash) {
    throw requestEvent.redirect(303, "/register/");
  }
  if (!progress.full_name || progress.age == null || !progress.country) {
    throw requestEvent.redirect(303, "/register/profile/");
  }

  return {
    email: progress.email,
    fullName: progress.full_name,
    age: progress.age,
    country: progress.country,
  };
});

export const useReviewAction = routeAction$(async (_data, requestEvent) => {
  const sessionId = getSessionId(requestEvent);
  const progress = getProgress(sessionId);

  if (!progress?.email || !progress.password_hash) {
    throw requestEvent.redirect(303, "/register/");
  }
  if (!progress.full_name || progress.age == null || !progress.country) {
    throw requestEvent.redirect(303, "/register/profile/");
  }

  // Re-check uniqueness in case another registration completed in the
  // meantime (race condition between the account step and final submit).
  const existing = findUserByEmail(progress.email);
  if (existing) {
    return requestEvent.fail(409, {
      message:
        "That email was just registered by someone else. Please start again with a different email.",
    });
  }

  insertUser({
    email: progress.email,
    passwordHash: progress.password_hash,
    fullName: progress.full_name,
    age: progress.age,
    country: progress.country,
  });

  clearProgress(sessionId);

  throw requestEvent.redirect(
    303,
    `/register/success/?email=${encodeURIComponent(progress.email)}`,
  );
});

export default component$(() => {
  const reviewData = useReviewData();
  const action = useReviewAction();

  return (
    <div class="wizard-page">
      <WizardSteps current={3} />
      <div class="wizard-card">
        <h1>Review &amp; submit</h1>
        <p class="subtitle">Step 3 of 3 &mdash; Please check your details</p>

        {action.value?.message && (
          <div class="form-error">{action.value.message}</div>
        )}

        <ul class="review-list">
          <li>
            <span>Email</span>
            <span>{reviewData.value.email}</span>
          </li>
          <li>
            <span>Full name</span>
            <span>{reviewData.value.fullName}</span>
          </li>
          <li>
            <span>Age</span>
            <span>{reviewData.value.age}</span>
          </li>
          <li>
            <span>Country</span>
            <span>{reviewData.value.country}</span>
          </li>
        </ul>

        <Form action={action}>
          <button type="submit" class="btn-primary" disabled={action.isRunning}>
            {action.isRunning ? "Submitting..." : "Confirm & Register"}
          </button>
        </Form>

        <p style="margin-top: 1rem; text-align: center;">
          <a class="link-muted" href="/register/profile/">
            &larr; Back to profile details
          </a>
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Register - Review | Qwik Wizard",
  meta: [
    {
      name: "description",
      content: "Review your details before submitting - step 3 of the registration wizard.",
    },
  ],
};
