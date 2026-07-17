import { component$ } from "@builder.io/qwik";
import { routeAction$, routeLoader$, Form } from "@builder.io/qwik-city";
import { getSession, clearSession } from "../../../lib/session.server";
import { createUser } from "../../../lib/db.server";

export const useReviewLoader = routeLoader$(async ({ cookie, redirect }) => {
  const session = getSession(cookie);
  if (!session.email || !session.passwordHash) {
    throw redirect(302, "/register/");
  }
  if (!session.fullName || session.age === undefined || !session.country) {
    throw redirect(302, "/register/profile/");
  }
  return {
    email: session.email,
    fullName: session.fullName,
    age: session.age,
    country: session.country,
  };
});

export const useReviewAction = routeAction$(async (_, { cookie, redirect }) => {
  const session = getSession(cookie);
  if (!session.email || !session.passwordHash) {
    throw redirect(302, "/register/");
  }
  if (!session.fullName || session.age === undefined || !session.country) {
    throw redirect(302, "/register/profile/");
  }

  // Create user in SQLite
  createUser({
    email: session.email,
    passwordHash: session.passwordHash,
    fullName: session.fullName,
    age: session.age,
    country: session.country,
  });

  const email = session.email;

  // Clear session progress
  clearSession(cookie);

  // Redirect to success page
  throw redirect(303, `/register/success/?email=${encodeURIComponent(email)}`);
});

export default component$(() => {
  const loader = useReviewLoader();
  const action = useReviewAction();

  return (
    <div class="container">
      <div class="wizard-header">
        <h1 class="wizard-title">Review & Submit</h1>
        <p class="wizard-subtitle">Step 3 of 3 — Confirm your details</p>
      </div>

      {/* Progress Indicator */}
      <div class="progress-steps">
        <div class="step-item completed">
          <div class="step-circle">1</div>
          <div class="step-label">Account</div>
        </div>
        <div class="step-item completed">
          <div class="step-circle">2</div>
          <div class="step-label">Profile</div>
        </div>
        <div class="step-item active">
          <div class="step-circle">3</div>
          <div class="step-label">Review</div>
        </div>
      </div>

      <div class="form-card">
        <div class="review-section">
          <div class="review-label">Email Address</div>
          <div class="review-value">{loader.value.email}</div>
        </div>

        <div class="review-section">
          <div class="review-label">Full Name</div>
          <div class="review-value">{loader.value.fullName}</div>
        </div>

        <div class="review-section">
          <div class="review-label">Age</div>
          <div class="review-value">{loader.value.age} years old</div>
        </div>

        <div class="review-section">
          <div class="review-label">Country</div>
          <div class="review-value">{loader.value.country}</div>
        </div>

        <Form action={action}>
          <div class="button-group">
            <a href="/register/profile/" class="btn btn-secondary">
              Back to Profile
            </a>
            <button type="submit" class="btn btn-primary">
              Submit Registration
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
});
