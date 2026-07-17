import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";

// Helper to validate email format
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Step 1: Account Details Action
export const useStep1Action = routeAction$(async (data, { cookie, redirect, fail }) => {
  const username = (data.username as string || "").trim();
  const password = (data.password as string || "").trim();

  const isUsernameInvalid = username.length < 3;
  const isPasswordInvalid = password.length < 6;

  if (isUsernameInvalid || isPasswordInvalid) {
    return fail(400, {
      errors: {
        username: isUsernameInvalid ? "Username must be at least 3 characters" : undefined,
        password: isPasswordInvalid ? "Password must be at least 6 characters" : undefined,
      },
      values: {
        username,
      },
    });
  }

  // Set the signup_step1 cookie on path '/' containing the credentials JSON
  cookie.set("signup_step1", { username, password }, { path: "/" });

  // Redirect to Step 2
  throw redirect(303, "/signup?step=2");
});

// Step 2: Profile Details Action
export const useStep2Action = routeAction$(async (data, { cookie, redirect, fail }) => {
  // Check if step 1 cookie is missing
  if (!cookie.has("signup_step1")) {
    throw redirect(303, "/signup?step=1");
  }

  const fullName = (data.fullName as string || "").trim();
  const email = (data.email as string || "").trim();

  const isFullNameInvalid = fullName.length < 2;
  const isEmailInvalid = !isValidEmail(email);

  if (isFullNameInvalid || isEmailInvalid) {
    return fail(400, {
      errors: {
        fullName: isFullNameInvalid ? "Full name must be at least 2 characters" : undefined,
        email: isEmailInvalid ? "Invalid email address" : undefined,
      },
      values: {
        fullName,
        email,
      },
    });
  }

  // Set the signup_step2 cookie on path '/' containing the profile details JSON
  cookie.set("signup_step2", { fullName, email }, { path: "/" });

  // Redirect to Step 3
  throw redirect(303, "/signup?step=3");
});

// Step 3: Review & Submit Action
export const useStep3Action = routeAction$(async (_, { cookie, redirect, sharedMap }) => {
  // Verify both cookies are present before proceeding
  if (!cookie.has("signup_step1") || !cookie.has("signup_step2")) {
    throw redirect(303, "/signup?step=1");
  }

  // Clear/delete both cookies
  cookie.delete("signup_step1", { path: "/" });
  cookie.delete("signup_step2", { path: "/" });

  // Mark success in sharedMap so loader does not redirect us
  sharedMap.set("signup_success", true);

  return {
    success: true,
  };
});

// Route Loader to validate step and load state
export const useSignupLoader = routeLoader$(({ query, redirect, cookie, sharedMap }) => {
  const step = query.get("step");

  // Redirect to Step 1 if step query parameter is missing or invalid
  if (!step || !["1", "2", "3"].includes(step)) {
    throw redirect(302, "/signup?step=1");
  }

  const isSuccess = sharedMap.get("signup_success");

  // State validation redirects
  if (step === "2") {
    if (!cookie.has("signup_step1")) {
      throw redirect(302, "/signup?step=1");
    }
  } else if (step === "3" && !isSuccess) {
    if (!cookie.has("signup_step1") || !cookie.has("signup_step2")) {
      throw redirect(302, "/signup?step=1");
    }
  }

  // Retrieve cookie data if available
  const step1Data = cookie.get("signup_step1")?.json<{ username?: string }>() || null;
  const step2Data = cookie.get("signup_step2")?.json<{ fullName?: string; email?: string }>() || null;

  return {
    step,
    step1Data,
    step2Data,
  };
});

export default component$(() => {
  const step1Action = useStep1Action();
  const step2Action = useStep2Action();
  const step3Action = useStep3Action();
  const loader = useSignupLoader();

  const { step, step1Data, step2Data } = loader.value;

  // Render Success View if Step 3 submission succeeded
  if (step === "3" && step3Action.value?.success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Signup Complete</h1>
          <div style={successMessageStyle}>
            <p style={{ fontSize: "1.25rem", color: "#155724", margin: "0 0 1.5rem 0" }}>
              Signup complete!
            </p>
            <p style={{ color: "#333", marginBottom: "2rem" }}>
              Thank you for signing up. Your account has been successfully created.
            </p>
          </div>
          <a href="/signup?step=1" style={primaryButtonStyle}>
            Start Over
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Signup Wizard</h1>

        {/* Progress Indicator */}
        <div style={progressContainerStyle}>
          <div style={step === "1" ? activeStepStyle : inactiveStepStyle}>1. Account</div>
          <div style={step === "2" ? activeStepStyle : inactiveStepStyle}>2. Profile</div>
          <div style={step === "3" ? activeStepStyle : inactiveStepStyle}>3. Review</div>
        </div>

        {/* Step 1: Account Details */}
        {step === "1" && (
          <Form action={step1Action} style={formStyle} noValidate>
            <div style={formGroupStyle}>
              <label for="username" style={labelStyle}>
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={step1Action.value?.failed ? step1Action.value.values?.username : (step1Data?.username || "")}
                style={inputStyle}
                autoComplete="username"
              />
              {step1Action.value?.failed && step1Action.value.errors?.username && (
                <span style={errorStyle}>{step1Action.value.errors.username}</span>
              )}
            </div>

            <div style={formGroupStyle}>
              <label for="password" style={labelStyle}>
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                style={inputStyle}
                autoComplete="new-password"
              />
              {step1Action.value?.failed && step1Action.value.errors?.password && (
                <span style={errorStyle}>{step1Action.value.errors.password}</span>
              )}
            </div>

            <button type="submit" style={primaryButtonStyle}>
              Next Step
            </button>
          </Form>
        )}

        {/* Step 2: Profile Details */}
        {step === "2" && (
          <Form action={step2Action} style={formStyle} noValidate>
            <div style={formGroupStyle}>
              <label for="fullName" style={labelStyle}>
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={step2Action.value?.failed ? step2Action.value.values?.fullName : (step2Data?.fullName || "")}
                style={inputStyle}
                autoComplete="name"
              />
              {step2Action.value?.failed && step2Action.value.errors?.fullName && (
                <span style={errorStyle}>{step2Action.value.errors.fullName}</span>
              )}
            </div>

            <div style={formGroupStyle}>
              <label for="email" style={labelStyle}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={step2Action.value?.failed ? step2Action.value.values?.email : (step2Data?.email || "")}
                style={inputStyle}
                autoComplete="email"
              />
              {step2Action.value?.failed && step2Action.value.errors?.email && (
                <span style={errorStyle}>{step2Action.value.errors.email}</span>
              )}
            </div>

            <div style={buttonGroupStyle}>
              <a href="/signup?step=1" style={secondaryButtonStyle}>
                Back
              </a>
              <button type="submit" style={primaryButtonStyle}>
                Next Step
              </button>
            </div>
          </Form>
        )}

        {/* Step 3: Review & Submit */}
        {step === "3" && (
          <div style={formStyle}>
            <div style={reviewContainerStyle}>
              <h2 style={reviewTitleStyle}>Review Your Details</h2>
              
              <div style={reviewItemStyle}>
                <span style={reviewLabelStyle}>Username:</span>
                <span style={reviewValueStyle}>{step1Data?.username}</span>
              </div>

              <div style={reviewItemStyle}>
                <span style={reviewLabelStyle}>Password:</span>
                <span style={reviewValueStyle}>•••••••• (Hidden)</span>
              </div>

              <div style={reviewItemStyle}>
                <span style={reviewLabelStyle}>Full Name:</span>
                <span style={reviewValueStyle}>{step2Data?.fullName}</span>
              </div>

              <div style={reviewItemStyle}>
                <span style={reviewLabelStyle}>Email:</span>
                <span style={reviewValueStyle}>{step2Data?.email}</span>
              </div>
            </div>

            <Form action={step3Action}>
              <div style={buttonGroupStyle}>
                <a href="/signup?step=2" style={secondaryButtonStyle}>
                  Back
                </a>
                <button type="submit" style={primaryButtonStyle}>
                  Confirm & Submit
                </button>
              </div>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
});

// Inline Styles for clean professional design without external dependencies
const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "100vh",
  backgroundColor: "#f4f7f6",
  fontFamily: "system-ui, -apple-system, sans-serif",
  padding: "1rem",
};

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  padding: "2.5rem",
  width: "100%",
  maxWidth: "500px",
  boxSizing: "border-box" as const,
};

const titleStyle = {
  fontSize: "2rem",
  fontWeight: "bold" as const,
  color: "#333333",
  textAlign: "center" as const,
  margin: "0 0 1.5rem 0",
};

const progressContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "2.5rem",
  borderBottom: "2px solid #e9ecef",
  paddingBottom: "0.75rem",
};

const activeStepStyle = {
  fontWeight: "bold" as const,
  color: "#007bff",
  borderBottom: "3px solid #007bff",
  paddingBottom: "0.75rem",
  marginBottom: "-11px",
};

const inactiveStepStyle = {
  color: "#6c757d",
  paddingBottom: "0.75rem",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "1.5rem",
};

const formGroupStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "0.5rem",
};

const labelStyle = {
  fontSize: "0.9rem",
  fontWeight: "600" as const,
  color: "#495057",
};

const inputStyle = {
  padding: "0.75rem",
  borderRadius: "4px",
  border: "1px solid #ced4da",
  fontSize: "1rem",
  width: "100%",
  boxSizing: "border-box" as const,
};

const errorStyle = {
  color: "#dc3545",
  fontSize: "0.85rem",
  marginTop: "0.25rem",
};

const buttonGroupStyle = {
  display: "flex",
  gap: "1rem",
  marginTop: "1rem",
};

const primaryButtonStyle = {
  display: "inline-block",
  textAlign: "center" as const,
  backgroundColor: "#007bff",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  fontWeight: "600" as const,
  cursor: "pointer",
  textDecoration: "none",
  flex: 1,
};

const secondaryButtonStyle = {
  display: "inline-block",
  textAlign: "center" as const,
  backgroundColor: "#ffffff",
  color: "#495057",
  border: "1px solid #ced4da",
  borderRadius: "4px",
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  fontWeight: "600" as const,
  cursor: "pointer",
  textDecoration: "none",
  flex: 1,
};

const successMessageStyle = {
  backgroundColor: "#d4edda",
  border: "1px solid #c3e6cb",
  borderRadius: "4px",
  padding: "1.5rem",
  textAlign: "center" as const,
  marginBottom: "2rem",
};

const reviewContainerStyle = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "6px",
  padding: "1.5rem",
  display: "flex",
  flexDirection: "column" as const,
  gap: "1rem",
};

const reviewTitleStyle = {
  fontSize: "1.2rem",
  fontWeight: "bold" as const,
  margin: "0 0 0.5rem 0",
  color: "#333333",
};

const reviewItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  borderBottom: "1px solid #dee2e6",
  paddingBottom: "0.5rem",
};

const reviewLabelStyle = {
  fontWeight: "600" as const,
  color: "#495057",
};

const reviewValueStyle = {
  color: "#212529",
};
