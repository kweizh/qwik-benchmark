import { component$ } from "@builder.io/qwik";
import {
  Form,
  Link,
  routeAction$,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { clearSession, readSession } from "~/lib/session";
import { createUser, findUserByEmail } from "~/lib/db.server";

export const useReviewData = routeLoader$((ev) => {
  const data = readSession(ev);
  if (!data.account) {
    throw ev.redirect(303, "/register/");
  }
  if (!data.profile) {
    throw ev.redirect(303, "/register/profile/");
  }
  return {
    email: data.account.email,
    fullName: data.profile.fullName,
    age: data.profile.age,
    country: data.profile.country,
  };
});

interface ReviewActionFailure {
  failed: true;
  message: string;
}

export const useSubmitAction = routeAction$(async (_values, ev) => {
  const data = readSession(ev);
  if (!data.account || !data.profile) {
    throw ev.redirect(303, "/register/");
  }

  // Final guard against a race where someone registered this email in another
  // tab between the account step and the submit.
  if (findUserByEmail(data.account.email)) {
    clearSession(ev);
    return ev.fail<ReviewActionFailure>(409, {
      failed: true,
      message: "This email was just registered in another tab.",
    });
  }

  createUser({
    email: data.account.email,
    passwordHash: data.account.passwordHash,
    fullName: data.profile.fullName,
    age: data.profile.age,
    country: data.profile.country,
  });

  // Remember the email to display on the success page, then drop the rest of
  // the session so the user cannot re-submit the form by replaying cookies.
  ev.cookie.set("registered_email", data.account.email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10,
  });
  clearSession(ev);

  throw ev.redirect(303, "/register/success/");
});

export default component$(() => {
  const loader = useReviewData();
  const action = useSubmitAction();

  const failure = action.value as ReviewActionFailure | undefined;
  const message = failure?.message;

  return (
    <main>
      <div class="steps" aria-label="Wizard progress">
        <span>
          <Link href="/register/">1. Account</Link>
        </span>
        <span>
          <Link href="/register/profile/">2. Profile</Link>
        </span>
        <span class="active">3. Review</span>
      </div>
      <h1>Review &amp; submit</h1>
      <p>Step 3 of 3. Please confirm your details below.</p>

      {message && (
        <div class="summary-error" role="alert">
          {message}
        </div>
      )}

      <dl class="review-list">
        <dt>Email</dt>
        <dd>{loader.value.email}</dd>
        <dt>Full name</dt>
        <dd>{loader.value.fullName}</dd>
        <dt>Age</dt>
        <dd>{loader.value.age}</dd>
        <dt>Country</dt>
        <dd>{loader.value.country}</dd>
      </dl>

      <p style="font-size: 0.85rem; color: #6b7280;">
        For your security, your password is never shown again after this point.
      </p>

      <Form action={action}>
        <div class="form-actions">
          <Link href="/register/profile/" class="secondary">
            ← Back
          </Link>
          <button type="submit">Confirm &amp; create account</button>
        </div>
      </Form>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Register · Review",
};