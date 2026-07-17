import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export const useSignupLoader = routeLoader$(async (event) => {
  const url = event.url;
  const step = url.searchParams.get("step");
  const success = url.searchParams.get("success") === "true";

  // If route is accessed without step, or step is invalid, redirect to step 1
  if (!step || (step !== "1" && step !== "2" && step !== "3")) {
    throw event.redirect(302, "/signup?step=1");
  }

  const cookie1 = event.cookie.get("signup_step1");
  const cookie2 = event.cookie.get("signup_step2");

  if (step === "2") {
    if (!cookie1) {
      throw event.redirect(302, "/signup?step=1");
    }
  }

  if (step === "3") {
    if (success) {
      return {
        step,
        success: true,
        step1Data: null,
        step2Data: null,
      };
    }
    if (!cookie1 || !cookie2) {
      throw event.redirect(302, "/signup?step=1");
    }
  }

  const step1Data = cookie1 ? cookie1.json<any>() : null;
  if (step1Data && step1Data.password) {
    delete step1Data.password;
  }
  const step2Data = cookie2 ? cookie2.json<any>() : null;

  return {
    step,
    success: false,
    step1Data,
    step2Data,
  };
});

export const useSignupAction = routeAction$(async (data, event) => {
  const step = data.step as string;

  if (step === "1") {
    const username = (data.username as string || "").trim();
    const password = (data.password as string || "");

    const errors: Record<string, string> = {};
    if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    }
    if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      return event.fail(400, {
        step: "1",
        errors,
        username,
      });
    }

    event.cookie.set("signup_step1", { username, password }, { path: "/" });
    throw event.redirect(303, "/signup?step=2");
  }

  if (step === "2") {
    const fullName = (data.fullName as string || "").trim();
    const email = (data.email as string || "").trim();

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors: Record<string, string> = {};
    if (fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (!emailRegex.test(email)) {
      errors.email = "Invalid email address";
    }

    if (Object.keys(errors).length > 0) {
      return event.fail(400, {
        step: "2",
        errors,
        fullName,
        email,
      });
    }

    event.cookie.set("signup_step2", { fullName, email }, { path: "/" });
    throw event.redirect(303, "/signup?step=3");
  }

  if (step === "3") {
    event.cookie.delete("signup_step1", { path: "/" });
    event.cookie.delete("signup_step2", { path: "/" });
    throw event.redirect(303, "/signup?step=3&success=true");
  }

  return { success: false };
});

export default component$(() => {
  const loader = useSignupLoader();
  const signupAction = useSignupAction();

  const step = loader.value.step;
  const isSuccess = loader.value.success;

  // Step 1 values
  const step1Username = signupAction.value?.step === "1"
    ? signupAction.value.username
    : (loader.value.step1Data?.username || "");

  // Step 2 values
  const step2FullName = signupAction.value?.step === "2"
    ? signupAction.value.fullName
    : (loader.value.step2Data?.fullName || "");

  const step2Email = signupAction.value?.step === "2"
    ? signupAction.value.email
    : (loader.value.step2Data?.email || "");

  return (
    <div class="wizard-container">
      <style>{`
        .wizard-container {
          max-width: 500px;
          margin: 40px auto;
          padding: 24px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #eaeaea;
        }
        .wizard-title {
          font-size: 24px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 24px;
          text-align: center;
        }
        .step-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
          position: relative;
        }
        .step-indicator::before {
          content: "";
          position: absolute;
          top: 14px;
          left: 0;
          right: 0;
          height: 2px;
          background: #e0e0e0;
          z-index: 1;
        }
        .step-node {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          color: #888888;
        }
        .step-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
          font-weight: bold;
          color: #888888;
          transition: all 0.2s ease;
        }
        .step-node.active .step-circle {
          border-color: #0070f3;
          background: #0070f3;
          color: #ffffff;
        }
        .step-node.completed .step-circle {
          border-color: #0070f3;
          background: #ffffff;
          color: #0070f3;
        }
        .step-node.active {
          color: #0070f3;
        }
        .step-node.completed {
          color: #111111;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #444444;
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 12px;
          font-size: 15px;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .form-group input:focus {
          border-color: #0070f3;
          outline: none;
        }
        .error-message {
          color: #ff1a1a;
          font-size: 13px;
          margin-top: 4px;
          font-weight: 500;
        }
        .btn-submit {
          width: 100%;
          padding: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          background: #0070f3;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn-submit:hover {
          background: #0051a2;
        }
        .review-details {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          border: 1px solid #eee;
        }
        .review-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eaeaea;
        }
        .review-row:last-child {
          border-bottom: none;
        }
        .review-label {
          font-weight: 600;
          color: #666666;
          font-size: 14px;
        }
        .review-value {
          color: #111111;
          font-weight: 500;
          font-size: 14px;
        }
        .success-view {
          text-align: center;
          padding: 16px 0;
        }
        .success-icon {
          font-size: 48px;
          color: #0070f3;
          margin-bottom: 16px;
        }
        .success-text {
          font-size: 18px;
          font-weight: 600;
          color: #111111;
          margin-bottom: 24px;
        }
        .btn-link {
          display: inline-block;
          text-decoration: none;
          padding: 10px 20px;
          background: #0070f3;
          color: #ffffff;
          font-weight: 600;
          border-radius: 6px;
          transition: background 0.2s ease;
        }
        .btn-link:hover {
          background: #0051a2;
        }
      `}</style>

      <h1 class="wizard-title">Signup Wizard</h1>

      {!isSuccess && (
        <div class="step-indicator">
          <div class={`step-node ${step === "1" ? "active" : "completed"}`}>
            <div class="step-circle">1</div>
            Account
          </div>
          <div class={`step-node ${step === "2" ? "active" : step === "3" ? "completed" : ""}`}>
            <div class="step-circle">2</div>
            Profile
          </div>
          <div class={`step-node ${step === "3" ? "active" : ""}`}>
            <div class="step-circle">3</div>
            Review
          </div>
        </div>
      )}

      {isSuccess ? (
        <div class="success-view">
          <div class="success-icon">✓</div>
          <div class="success-text">Signup complete!</div>
          <a href="/signup?step=1" class="btn-link">Start Over</a>
        </div>
      ) : step === "1" ? (
        <Form action={signupAction}>
          <input type="hidden" name="step" value="1" />
          
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={step1Username}
              autoComplete="username"
            />
            {signupAction.value?.step === "1" && signupAction.value.errors?.username && (
              <div class="error-message">{signupAction.value.errors.username}</div>
            )}
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
            />
            {signupAction.value?.step === "1" && signupAction.value.errors?.password && (
              <div class="error-message">{signupAction.value.errors.password}</div>
            )}
          </div>

          <button type="submit" class="btn-submit">Next</button>
        </Form>
      ) : step === "2" ? (
        <Form action={signupAction}>
          <input type="hidden" name="step" value="2" />

          <div class="form-group">
            <label for="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={step2FullName}
              autoComplete="name"
            />
            {signupAction.value?.step === "2" && signupAction.value.errors?.fullName && (
              <div class="error-message">{signupAction.value.errors.fullName}</div>
            )}
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={step2Email}
              autoComplete="email"
            />
            {signupAction.value?.step === "2" && signupAction.value.errors?.email && (
              <div class="error-message">{signupAction.value.errors.email}</div>
            )}
          </div>

          <button type="submit" class="btn-submit">Next</button>
        </Form>
      ) : step === "3" ? (
        <div>
          <div class="review-details">
            <div class="review-row">
              <span class="review-label">Username</span>
              <span class="review-value">{loader.value.step1Data?.username}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Full Name</span>
              <span class="review-value">{loader.value.step2Data?.fullName}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Email</span>
              <span class="review-value">{loader.value.step2Data?.email}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Password</span>
              <span class="review-value">••••••</span>
            </div>
          </div>

          <Form action={signupAction}>
            <input type="hidden" name="step" value="3" />
            <button type="submit" class="btn-submit">Confirm & Submit</button>
          </Form>
        </div>
      ) : null}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Signup Wizard",
};
