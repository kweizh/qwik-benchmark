import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

// Helper to safely extract and parse cookie data
const getCookieData = (cookie: any, name: string) => {
  const rawValue = cookie.get(name)?.value;
  if (!rawValue) return null;
  try {
    return JSON.parse(decodeURIComponent(rawValue));
  } catch {
    try {
      return cookie.get(name)?.json() || null;
    } catch {
      return null;
    }
  }
};

export const useSignupLoader = routeLoader$((event) => {
  const step = event.query.get('step');

  // Routing & Edge Cases
  // If the route /signup is accessed without a step query parameter, or if step is invalid (not 1, 2, or 3), redirect to /signup?step=1.
  if (!step || !['1', '2', '3'].includes(step)) {
    throw event.redirect(302, '/signup?step=1');
  }

  const hasStep1 = event.cookie.has('signup_step1');
  const hasStep2 = event.cookie.has('signup_step2');

  // Step 2: Profile Details
  // If the user accesses Step 2 but the signup_step1 cookie is missing, redirect them back to /signup?step=1.
  if (step === '2' && !hasStep1) {
    throw event.redirect(302, '/signup?step=1');
  }

  // Step 3: Review & Submit
  // If the user accesses Step 3 but either the signup_step1 or signup_step2 cookie is missing, redirect them back to /signup?step=1.
  if (step === '3') {
    const signupSuccess = event.sharedMap.get('signup_success');
    if (!signupSuccess && (!hasStep1 || !hasStep2)) {
      throw event.redirect(302, '/signup?step=1');
    }
  }

  // Load cookies for review step
  const step1Data = getCookieData(event.cookie, 'signup_step1');
  const step2Data = getCookieData(event.cookie, 'signup_step2');

  return {
    step,
    step1Data,
    step2Data,
    signupSuccess: !!event.sharedMap.get('signup_success'),
  };
});

// Action for Step 1
export const useStep1Action = routeAction$(async (data, event) => {
  const username = (data.username as string || '').trim();
  const password = data.password as string || '';

  const errors: Record<string, string> = {};
  if (username.length < 3) {
    errors.username = "Username must be at least 3 characters";
  }
  if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (Object.keys(errors).length > 0) {
    return event.fail(400, {
      success: false,
      errors,
      username, // retain username
    });
  }

  const step1Data = { username, password };
  event.cookie.set('signup_step1', encodeURIComponent(JSON.stringify(step1Data)), { path: '/' });

  throw event.redirect(302, '/signup?step=2');
});

// Action for Step 2
export const useStep2Action = routeAction$(async (data, event) => {
  const fullName = (data.fullName as string || '').trim();
  const email = (data.email as string || '').trim();

  const errors: Record<string, string> = {};
  if (fullName.length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.email = "Invalid email address";
  }

  if (Object.keys(errors).length > 0) {
    return event.fail(400, {
      success: false,
      errors,
      fullName,
      email,
    });
  }

  const step2Data = { fullName, email };
  event.cookie.set('signup_step2', encodeURIComponent(JSON.stringify(step2Data)), { path: '/' });

  throw event.redirect(302, '/signup?step=3');
});

// Action for Step 3
export const useStep3Action = routeAction$(async (_, event) => {
  // Clear/delete both cookies signup_step1 and signup_step2
  event.cookie.delete('signup_step1', { path: '/' });
  event.cookie.delete('signup_step2', { path: '/' });

  // Set signup_success in sharedMap so loader doesn't redirect
  event.sharedMap.set('signup_success', true);

  return {
    success: true,
  };
});

export default component$(() => {
  const loader = useSignupLoader();
  const step1Action = useStep1Action();
  const step2Action = useStep2Action();
  const step3Action = useStep3Action();

  const currentStep = loader.value.step;
  const isSuccess = loader.value.signupSuccess || step3Action.value?.success;

  return (
    <div class="wizard-container">
      <style>{`
        .wizard-container {
          max-width: 500px;
          margin: 40px auto;
          padding: 30px;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          color: #333333;
        }
        .wizard-header {
          margin-bottom: 24px;
          text-align: center;
        }
        .wizard-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #111111;
        }
        .steps-indicator {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          position: relative;
        }
        .steps-indicator::before {
          content: '';
          position: absolute;
          top: 15px;
          left: 0;
          right: 0;
          height: 2px;
          background: #e0e0e0;
          z-index: 1;
        }
        .step-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          z-index: 2;
          color: #888888;
        }
        .step-dot.active {
          border-color: #0066cc;
          background: #0066cc;
          color: #ffffff;
        }
        .step-dot.completed {
          border-color: #00cc66;
          background: #00cc66;
          color: #ffffff;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #cccccc;
          border-radius: 4px;
          font-size: 16px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: #0066cc;
          outline: none;
        }
        .error-message {
          color: #dd3333;
          font-size: 13px;
          margin-top: 6px;
          margin-bottom: 0;
        }
        .button-group {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
        }
        .btn {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
          text-align: center;
          width: 100%;
        }
        .btn-primary {
          background-color: #0066cc;
          color: #ffffff;
        }
        .btn-primary:hover {
          background-color: #0052a3;
        }
        .btn-secondary {
          background-color: #f0f0f0;
          color: #333333;
          text-decoration: none;
          display: inline-block;
          box-sizing: border-box;
        }
        .btn-secondary:hover {
          background-color: #e0e0e0;
        }
        .review-details {
          background: #f9f9f9;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .review-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eeeeee;
        }
        .review-row:last-child {
          border-bottom: none;
        }
        .review-label {
          font-weight: 600;
          color: #666666;
        }
        .review-value {
          color: #111111;
        }
        .success-card {
          text-align: center;
          padding: 20px 0;
        }
        .success-icon {
          font-size: 48px;
          color: #00cc66;
          margin-bottom: 16px;
        }
      `}</style>

      {isSuccess ? (
        <div class="success-card">
          <div class="success-icon">✓</div>
          <h2 class="wizard-title">Signup complete!</h2>
          <p style={{ marginBottom: '30px' }}>Your registration was successful.</p>
          <a href="/signup?step=1" class="btn btn-secondary">Start Over</a>
        </div>
      ) : (
        <>
          <div class="wizard-header">
            <h2 class="wizard-title">
              {currentStep === '1' && "Account Details"}
              {currentStep === '2' && "Profile Details"}
              {currentStep === '3' && "Review & Submit"}
            </h2>
            <p style={{ margin: 0, color: '#666666' }}>Step {currentStep} of 3</p>
          </div>

          <div class="steps-indicator">
            <div class={`step-dot ${currentStep === '1' ? 'active' : 'completed'}`}>1</div>
            <div class={`step-dot ${currentStep === '2' ? 'active' : currentStep === '3' ? 'completed' : ''}`}>2</div>
            <div class={`step-dot ${currentStep === '3' ? 'active' : ''}`}>3</div>
          </div>

          {currentStep === '1' && (
            <Form action={step1Action}>
              <div class="form-group">
                <label class="form-label" for="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  class="form-input"
                  value={step1Action.value?.username ?? loader.value.step1Data?.username ?? ''}
                  autoComplete="username"
                />
                {step1Action.value?.errors?.username && (
                  <p class="error-message">{step1Action.value.errors.username}</p>
                )}
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  class="form-input"
                  autoComplete="new-password"
                />
                {step1Action.value?.errors?.password && (
                  <p class="error-message">{step1Action.value.errors.password}</p>
                )}
              </div>

              <div class="button-group">
                <button type="submit" class="btn btn-primary">Next</button>
              </div>
            </Form>
          )}

          {currentStep === '2' && (
            <Form action={step2Action}>
              <div class="form-group">
                <label class="form-label" for="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  class="form-input"
                  value={step2Action.value?.fullName ?? loader.value.step2Data?.fullName ?? ''}
                  autoComplete="name"
                />
                {step2Action.value?.errors?.fullName && (
                  <p class="error-message">{step2Action.value.errors.fullName}</p>
                )}
              </div>

              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="form-input"
                  value={step2Action.value?.email ?? loader.value.step2Data?.email ?? ''}
                  autoComplete="email"
                />
                {step2Action.value?.errors?.email && (
                  <p class="error-message">{step2Action.value.errors.email}</p>
                )}
              </div>

              <div class="button-group">
                <button type="submit" class="btn btn-primary">Next</button>
              </div>
            </Form>
          )}

          {currentStep === '3' && (
            <Form action={step3Action}>
              <div class="review-details">
                <div class="review-row">
                  <span class="review-label">Username</span>
                  <span class="review-value">{loader.value.step1Data?.username}</span>
                </div>
                <div class="review-row">
                  <span class="review-label">Password</span>
                  <span class="review-value">••••••••</span>
                </div>
                <div class="review-row">
                  <span class="review-label">Full Name</span>
                  <span class="review-value">{loader.value.step2Data?.fullName}</span>
                </div>
                <div class="review-row">
                  <span class="review-label">Email</span>
                  <span class="review-value">{loader.value.step2Data?.email}</span>
                </div>
              </div>

              <div class="button-group">
                <button type="submit" class="btn btn-primary">Submit</button>
              </div>
            </Form>
          )}
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Signup Wizard",
};
