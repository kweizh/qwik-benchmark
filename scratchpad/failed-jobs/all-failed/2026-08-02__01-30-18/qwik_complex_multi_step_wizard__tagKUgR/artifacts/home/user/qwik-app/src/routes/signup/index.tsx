import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export const useSignupLoader = routeLoader$(({ query, cookie, method, redirect }) => {
  const step = query.get("step");

  // Route & Edge Cases: If step is missing or invalid, redirect to step=1
  if (step !== "1" && step !== "2" && step !== "3") {
    throw redirect(302, "/signup?step=1");
  }

  const step1CookieVal = cookie.get("signup_step1")?.value;
  const step2CookieVal = cookie.get("signup_step2")?.value;

  let step1Data: Record<string, string> | null = null;
  if (step1CookieVal) {
    try {
      step1Data = JSON.parse(decodeURIComponent(step1CookieVal));
    } catch {
      try {
        step1Data = JSON.parse(step1CookieVal);
      } catch {
        // ignore
      }
    }
  }

  let step2Data: Record<string, string> | null = null;
  if (step2CookieVal) {
    try {
      step2Data = JSON.parse(decodeURIComponent(step2CookieVal));
    } catch {
      try {
        step2Data = JSON.parse(step2CookieVal);
      } catch {
        // ignore
      }
    }
  }

  // Progressive enhancement: Only redirect on GET requests
  if (method === "GET") {
    if (step === "2" && !step1Data) {
      throw redirect(302, "/signup?step=1");
    }
    if (step === "3" && (!step1Data || !step2Data)) {
      throw redirect(302, "/signup?step=1");
    }
  }

  return {
    step,
    step1Data,
    step2Data,
  };
});

export const useSignupAction = routeAction$(async (data, { cookie, redirect, fail }) => {
  const step = data.step as string;

  if (step === "1") {
    const username = (data.username as string || "").trim();
    const password = data.password as string || "";

    const errors: Record<string, string> = {};
    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        step: 1,
        errors,
        retained: {
          username,
        },
      });
    }

    // Set cookie
    const cookieVal = encodeURIComponent(JSON.stringify({ username, password }));
    cookie.set("signup_step1", cookieVal, { path: "/" });

    throw redirect(302, "/signup?step=2");
  }

  if (step === "2") {
    const fullName = (data.fullName as string || "").trim();
    const email = (data.email as string || "").trim();

    const errors: Record<string, string> = {};
    if (fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        step: 2,
        errors,
        retained: {
          fullName,
          email,
        },
      });
    }

    // Set cookie
    const cookieVal = encodeURIComponent(JSON.stringify({ fullName, email }));
    cookie.set("signup_step2", cookieVal, { path: "/" });

    throw redirect(302, "/signup?step=3");
  }

  if (step === "3") {
    // Clear cookies
    cookie.delete("signup_step1", { path: "/" });
    cookie.delete("signup_step2", { path: "/" });

    return {
      success: true,
      step: 3,
    };
  }

  return fail(400, {
    error: "Invalid step",
  });
});

export default component$(() => {
  const loader = useSignupLoader();
  const action = useSignupAction();

  const step = loader.value.step;

  // Render Success View if step 3 form was successfully submitted
  if (action.value?.success && action.value?.step === 3) {
    return (
      <div class="signup-container">
        <div class="success-icon">✓</div>
        <h1 class="signup-title">Signup complete!</h1>
        <p class="success-message">Your account has been successfully created.</p>
        <a href="/signup?step=1" class="btn btn-secondary">
          Start Over
        </a>
      </div>
    );
  }

  // Determine active step classes
  const isStep1Active = step === "1" ? "active" : "";
  const isStep2Active = step === "2" ? "active" : "";
  const isStep3Active = step === "3" ? "active" : "";

  const isStep1Completed = step === "2" || step === "3" ? "completed" : "";
  const isStep2Completed = step === "3" ? "completed" : "";

  // Extract errors and retained values from action if validation failed on the current step
  const isCurrentStepAction = action.value?.step?.toString() === step;
  const errors = (isCurrentStepAction ? action.value?.errors : {}) as Record<string, string> | undefined;
  const retained = (isCurrentStepAction ? action.value?.retained : {}) as Record<string, string> | undefined;

  // Compute values for Step 1
  const usernameValue = retained?.username ?? loader.value.step1Data?.username ?? "";

  // Compute values for Step 2
  const fullNameValue = retained?.fullName ?? loader.value.step2Data?.fullName ?? "";
  const emailValue = retained?.email ?? loader.value.step2Data?.email ?? "";

  return (
    <div class="signup-container">
      <h1 class="signup-title">Create Account</h1>
      <p class="signup-subtitle">Complete the 3-step registration process</p>

      {/* Progress Steps */}
      <div class="progress-steps">
        <div class={`step-indicator ${isStep1Completed || isStep1Active}`}>
          {isStep1Completed ? "✓" : "1"}
        </div>
        <div class={`step-indicator ${isStep2Completed || isStep2Active}`}>
          {isStep2Completed ? "✓" : "2"}
        </div>
        <div class={`step-indicator ${isStep3Active}`}>
          3
        </div>
      </div>

      <Form action={action}>
        <input type="hidden" name="step" value={step} />

        {step === "1" && (
          <div>
            <div class="form-group">
              <label class="form-label" for="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                class={`form-input ${errors?.username ? "error" : ""}`}
                value={usernameValue}
                autoComplete="off"
              />
              {errors?.username && <div class="error-message">{errors.username}</div>}
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                class={`form-input ${errors?.password ? "error" : ""}`}
              />
              {errors?.password && <div class="error-message">{errors.password}</div>}
            </div>

            <button type="submit" class="btn btn-primary">
              Next Step
            </button>
          </div>
        )}

        {step === "2" && (
          <div>
            <div class="form-group">
              <label class="form-label" for="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                class={`form-input ${errors?.fullName ? "error" : ""}`}
                value={fullNameValue}
              />
              {errors?.fullName && <div class="error-message">{errors.fullName}</div>}
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                class={`form-input ${errors?.email ? "error" : ""}`}
                value={emailValue}
              />
              {errors?.email && <div class="error-message">{errors.email}</div>}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <a href="/signup?step=1" class="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </a>
              <button type="submit" class="btn btn-primary" style={{ flex: 1 }}>
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === "3" && (
          <div>
            <div class="review-card">
              <div class="review-item">
                <span class="review-label">Username</span>
                <span class="review-value">{loader.value.step1Data?.username}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Full Name</span>
                <span class="review-value">{loader.value.step2Data?.fullName}</span>
              </div>
              <div class="review-item">
                <span class="review-label">Email</span>
                <span class="review-value">{loader.value.step2Data?.email}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <a href="/signup?step=2" class="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </a>
              <button type="submit" class="btn btn-primary" style={{ flex: 1 }}>
                Confirm & Submit
              </button>
            </div>
          </div>
        )}
      </Form>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Signup Wizard",
};
