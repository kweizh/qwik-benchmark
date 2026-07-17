import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  Form,
  zod$,
  z,
} from "@builder.io/qwik-city";

// --- Zod schemas for validation ---

const step1Schema = {
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
};

const step2Schema = {
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
};

// --- Route Loader: reads cookies and provides data for rendering ---

export const useSignupData = routeLoader$(async (requestEvent) => {
  const { cookie, url, redirect, request } = requestEvent;
  let step = url.searchParams.get("step");

  // If step is missing from URL (e.g., after form POST to ?qaction=...),
  // try to determine it from the referrer header
  if (!step) {
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        step = refererUrl.searchParams.get("step");
      } catch {
        // invalid referrer, ignore
      }
    }
  }

  // If step is missing or invalid, redirect to step 1
  if (!step || !["1", "2", "3"].includes(step)) {
    throw redirect(302, "/signup?step=1");
  }

  const stepNum = parseInt(step, 10);

  // If user is starting over at step 1, clear the completion flag
  if (stepNum === 1) {
    cookie.set("signup_complete", "", {
      path: "/",
      maxAge: 0,
    });
  }

  // Read cookies
  const step1Cookie = cookie.get("signup_step1");
  const step2Cookie = cookie.get("signup_step2");

  let step1Data: { username?: string; password?: string } | null = null;
  let step2Data: { fullName?: string; email?: string } | null = null;

  if (step1Cookie) {
    try {
      step1Data = JSON.parse(decodeURIComponent(step1Cookie.value));
    } catch {
      // invalid cookie, ignore
    }
  }

  if (step2Cookie) {
    try {
      step2Data = JSON.parse(decodeURIComponent(step2Cookie.value));
    } catch {
      // invalid cookie, ignore
    }
  }

  // Check for signup completion first
  const signupComplete = cookie.get("signup_complete");

  // If signup is complete, allow access to step 3 without the step cookies
  if (signupComplete && stepNum === 3) {
    return {
      step: stepNum,
      step1Data,
      step2Data,
      signupComplete: true,
    };
  }

  // Step 2 requires step1 cookie
  if (stepNum >= 2 && !step1Data) {
    throw redirect(302, "/signup?step=1");
  }

  // Step 3 requires both cookies
  if (stepNum === 3 && (!step1Data || !step2Data)) {
    throw redirect(302, "/signup?step=1");
  }

  return {
    step: stepNum,
    step1Data,
    step2Data,
    signupComplete: !!signupComplete,
  };
});

// --- Step 1 Action: Account Details ---

export const useStep1Action = routeAction$(
  async (data, { cookie, redirect, fail }) => {
    // Validation is handled by zod$, so if we get here data is valid
    const step1Data = {
      username: data.username as string,
      password: data.password as string,
    };

    cookie.set("signup_step1", encodeURIComponent(JSON.stringify(step1Data)), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    throw redirect(302, "/signup?step=2");
  },
  zod$(step1Schema),
);

// --- Step 2 Action: Profile Details ---

export const useStep2Action = routeAction$(
  async (data, { cookie, redirect, fail }) => {
    const step2Data = {
      fullName: data.fullName as string,
      email: data.email as string,
    };

    cookie.set("signup_step2", encodeURIComponent(JSON.stringify(step2Data)), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    throw redirect(302, "/signup?step=3");
  },
  zod$(step2Schema),
);

// --- Step 3 Action: Confirm & Clear ---

export const useStep3Action = routeAction$(
  async (_data, { cookie, redirect }) => {
    // Clear both step cookies
    cookie.set("signup_step1", "", {
      path: "/",
      maxAge: 0,
    });
    cookie.set("signup_step2", "", {
      path: "/",
      maxAge: 0,
    });

    // Set a completion flag cookie so the loader knows signup is done
    cookie.set("signup_complete", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    throw redirect(302, "/signup?step=3");
  },
  zod$({
    confirm: z.string().optional(),
  }),
);

// --- Component ---

export default component$(() => {
  const signupData = useSignupData();
  const step1Action = useStep1Action();
  const step2Action = useStep2Action();
  const step3Action = useStep3Action();

  const step = signupData.value.step;

  // Step 3 success state
  if (step === 3 && signupData.value.signupComplete) {
    return (
      <div>
        <h1>Signup Complete</h1>
        <p>Signup complete!</p>
        <a href="/signup?step=1">Start Over</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Signup Wizard</h1>

      {/* --- Step Indicator --- */}
      <div style={{ marginBottom: "20px" }}>
        <span style={{ fontWeight: step === 1 ? "bold" : "normal" }}>
          Step 1: Account
        </span>
        {" → "}
        <span style={{ fontWeight: step === 2 ? "bold" : "normal" }}>
          Step 2: Profile
        </span>
        {" → "}
        <span style={{ fontWeight: step === 3 ? "bold" : "normal" }}>
          Step 3: Review
        </span>
      </div>

      {/* --- Step 1: Account Details --- */}
      {step === 1 && (
        <Form action={step1Action}>
          <div>
            <label for="username">Username</label>
            <br />
            <input
              id="username"
              name="username"
              type="text"
              value={
                (step1Action.formData?.get("username") as string) ?? ""
              }
            />
            {step1Action.value?.failed && (
              <div style={{ color: "red" }}>
                {step1Action.value.fieldErrors?.username}
              </div>
            )}
          </div>

          <div style={{ marginTop: "10px" }}>
            <label for="password">Password</label>
            <br />
            <input
              id="password"
              name="password"
              type="password"
            />
            {step1Action.value?.failed && (
              <div style={{ color: "red" }}>
                {step1Action.value.fieldErrors?.password}
              </div>
            )}
          </div>

          <div style={{ marginTop: "15px" }}>
            <button type="submit">Next</button>
          </div>
        </Form>
      )}

      {/* --- Step 2: Profile Details --- */}
      {step === 2 && (
        <Form action={step2Action}>
          <div>
            <label for="fullName">Full Name</label>
            <br />
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={
                (step2Action.formData?.get("fullName") as string) ?? ""
              }
            />
            {step2Action.value?.failed && (
              <div style={{ color: "red" }}>
                {step2Action.value.fieldErrors?.fullName}
              </div>
            )}
          </div>

          <div style={{ marginTop: "10px" }}>
            <label for="email">Email</label>
            <br />
            <input
              id="email"
              name="email"
              type="email"
              value={
                (step2Action.formData?.get("email") as string) ?? ""
              }
            />
            {step2Action.value?.failed && (
              <div style={{ color: "red" }}>
                {step2Action.value.fieldErrors?.email}
              </div>
            )}
          </div>

          <div style={{ marginTop: "15px" }}>
            <button type="submit">Next</button>
          </div>
        </Form>
      )}

      {/* --- Step 3: Review & Submit --- */}
      {step === 3 && (
        <div>
          <h2>Review Your Information</h2>
          <table>
            <tbody>
              <tr>
                <td><strong>Username:</strong></td>
                <td>{signupData.value.step1Data?.username}</td>
              </tr>
              <tr>
                <td><strong>Password:</strong></td>
                <td>{"•".repeat(8)}</td>
              </tr>
              <tr>
                <td><strong>Full Name:</strong></td>
                <td>{signupData.value.step2Data?.fullName}</td>
              </tr>
              <tr>
                <td><strong>Email:</strong></td>
                <td>{signupData.value.step2Data?.email}</td>
              </tr>
            </tbody>
          </table>

          <Form action={step3Action} style={{ marginTop: "15px" }}>
            <input type="hidden" name="confirm" value="true" />
            <button type="submit">Confirm Signup</button>
          </Form>
        </div>
      )}
    </div>
  );
});
