import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type RequestHandler,
  type DocumentHead,
} from "@builder.io/qwik-city";

/**
 * Shape of the cookie stored after Step 1 (Account Details) is completed.
 */
interface Step1Cookie {
  username: string;
  password: string;
}

/**
 * Shape of the cookie stored after Step 2 (Profile Details) is completed.
 */
interface Step2Cookie {
  fullName: string;
  email: string;
}

/**
 * State that is shared between the `onPost` handler and the `routeLoader$`
 * for the *same* request. This is how validation errors / retained form
 * values are surfaced to the component when a POST fails validation without
 * a redirect.
 */
interface SignupFormState {
  errors: Record<string, string>;
  values: Record<string, string>;
  success: boolean;
}

const SIGNUP_STATE_KEY = "signupWizardState";
const STEP1_COOKIE = "signup_step1";
const STEP2_COOKIE = "signup_step2";

// Simple, pragmatic email format check (no client-side JS required).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseStep(raw: string | null): 1 | 2 | 3 | null {
  if (raw === "1" || raw === "2" || raw === "3") {
    return Number(raw) as 1 | 2 | 3;
  }
  return null;
}

/**
 * Runs for every HTTP method (GET and POST) before any method specific
 * handler or loader. It is responsible for all of the routing / guard rules:
 *  - Missing or invalid `step` query param -> redirect to step=1
 *  - Step 2 without a completed Step 1 -> redirect to step=1
 *  - Step 3 without a completed Step 1 & 2 -> redirect to step=1
 */
export const onRequest: RequestHandler = ({ query, redirect, cookie }) => {
  const step = parseStep(query.get("step"));

  if (step === null) {
    throw redirect(302, "/signup/?step=1");
  }

  if (step >= 2 && !cookie.get(STEP1_COOKIE)) {
    throw redirect(302, "/signup/?step=1");
  }

  if (step === 3 && !cookie.get(STEP2_COOKIE)) {
    throw redirect(302, "/signup/?step=1");
  }
};

/**
 * Handles the native <form method="post"> submissions for all 3 steps.
 * Which step is being submitted is determined purely from the `step` query
 * param, so this works with plain HTML forms and requires no client-side JS.
 */
export const onPost: RequestHandler = async (requestEvent) => {
  const { query, parseBody, cookie, redirect, sharedMap } = requestEvent;
  const step = parseStep(query.get("step"));
  const body = ((await parseBody()) as Record<string, string> | null) ?? {};

  if (step === 1) {
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const errors: Record<string, string> = {};

    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      sharedMap.set(SIGNUP_STATE_KEY, {
        errors,
        values: { username },
        success: false,
      } satisfies SignupFormState);
      return;
    }

    cookie.set(STEP1_COOKIE, { username, password }, { path: "/" });
    throw redirect(303, "/signup/?step=2");
  }

  if (step === 2) {
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const errors: Record<string, string> = {};

    if (fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (!EMAIL_REGEX.test(email)) {
      errors.email = "Invalid email address";
    }

    if (Object.keys(errors).length > 0) {
      sharedMap.set(SIGNUP_STATE_KEY, {
        errors,
        values: { fullName, email },
        success: false,
      } satisfies SignupFormState);
      return;
    }

    cookie.set(STEP2_COOKIE, { fullName, email }, { path: "/" });
    throw redirect(303, "/signup/?step=3");
  }

  if (step === 3) {
    cookie.delete(STEP1_COOKIE, { path: "/" });
    cookie.delete(STEP2_COOKIE, { path: "/" });
    sharedMap.set(SIGNUP_STATE_KEY, {
      errors: {},
      values: {},
      success: true,
    } satisfies SignupFormState);
  }
};

export const useSignupData = routeLoader$((requestEvent) => {
  const { query, cookie, sharedMap } = requestEvent;
  const step = parseStep(query.get("step")) ?? 1;
  const shared = sharedMap.get(SIGNUP_STATE_KEY) as SignupFormState | undefined;

  const step1 = cookie.get(STEP1_COOKIE)?.json<Step1Cookie>();
  const step2 = cookie.get(STEP2_COOKIE)?.json<Step2Cookie>();

  return {
    step,
    errors: shared?.errors ?? {},
    values: shared?.values ?? {},
    success: shared?.success ?? false,
    username: step1?.username ?? "",
    fullName: step2?.fullName ?? "",
    email: step2?.email ?? "",
  };
});

export default component$(() => {
  const data = useSignupData();
  const { step, errors, values, success, username, fullName, email } =
    data.value;

  if (success) {
    return (
      <div style={{ maxWidth: "480px", margin: "2rem auto", fontFamily: "sans-serif" }}>
        <h1>Signup complete!</h1>
        <p>Your account has been created successfully.</p>
        <a href="/signup/?step=1">Start over</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Sign Up &mdash; Step {step} of 3</h1>

      {step === 1 && (
        <form method="post" action="/signup/?step=1">
          <div style={{ marginBottom: "1rem" }}>
            <label for="username">Username</label>
            <br />
            <input id="username" name="username" type="text" value={values.username ?? ""} />
            {errors.username && (
              <p style={{ color: "red", margin: "0.25rem 0 0" }}>{errors.username}</p>
            )}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label for="password">Password</label>
            <br />
            <input id="password" name="password" type="password" />
            {errors.password && (
              <p style={{ color: "red", margin: "0.25rem 0 0" }}>{errors.password}</p>
            )}
          </div>
          <button type="submit">Next</button>
        </form>
      )}

      {step === 2 && (
        <form method="post" action="/signup/?step=2">
          <div style={{ marginBottom: "1rem" }}>
            <label for="fullName">Full Name</label>
            <br />
            <input id="fullName" name="fullName" type="text" value={values.fullName ?? ""} />
            {errors.fullName && (
              <p style={{ color: "red", margin: "0.25rem 0 0" }}>{errors.fullName}</p>
            )}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label for="email">Email</label>
            <br />
            <input id="email" name="email" type="email" value={values.email ?? ""} />
            {errors.email && (
              <p style={{ color: "red", margin: "0.25rem 0 0" }}>{errors.email}</p>
            )}
          </div>
          <button type="submit">Next</button>
        </form>
      )}

      {step === 3 && (
        <div>
          <h2>Review your details</h2>
          <ul>
            <li>
              <strong>Username:</strong> {username}
            </li>
            <li>
              <strong>Full Name:</strong> {fullName}
            </li>
            <li>
              <strong>Email:</strong> {email}
            </li>
            <li>
              <strong>Password:</strong> ********
            </li>
          </ul>
          <form method="post" action="/signup/?step=3">
            <button type="submit">Confirm &amp; Submit</button>
          </form>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Sign Up",
  meta: [
    {
      name: "description",
      content: "Multi-step signup wizard",
    },
  ],
};
