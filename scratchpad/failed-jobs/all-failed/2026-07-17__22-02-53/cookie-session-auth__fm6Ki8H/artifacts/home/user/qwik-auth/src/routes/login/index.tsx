import { component$ } from "@builder.io/qwik";
import { Form, routeAction$ } from "@builder.io/qwik-city";
import { getUserByUsername, verifyPassword, createSession } from "../../auth.server";

export const useLoginAction = routeAction$((data, event) => {
  const username = String(data.username || "").trim();
  const password = String(data.password || "");

  if (!username || !password) {
    return {
      success: false,
      message: "Invalid username or password",
    };
  }

  const user = getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return {
      success: false,
      message: "Invalid username or password",
    };
  }

  // Create session
  const sessionId = createSession(username);

  // Set HTTP-only cookie
  event.cookie.set("session", sessionId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });

  throw event.redirect(302, "/dashboard");
});

export default component$(() => {
  const loginAction = useLoginAction();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Login</h1>
      
      {loginAction.value && !loginAction.value.success && (
        <div style={{ color: "red", marginBottom: "15px" }} id="error-message">
          {loginAction.value.message}
        </div>
      )}

      <Form action={loginAction}>
        <div style={{ marginBottom: "10px" }}>
          <label for="username" style={{ display: "block", marginBottom: "5px" }}>Username</label>
          <input
            type="text"
            id="username"
            name="username"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label for="password" style={{ display: "block", marginBottom: "5px" }}>Password</label>
          <input
            type="password"
            id="password"
            name="password"
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
            required
          />
        </div>

        <button type="submit" style={{ padding: "10px 20px", cursor: "pointer" }}>
          Login
        </button>
      </Form>
    </div>
  );
});
