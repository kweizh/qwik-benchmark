import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, type DocumentHead } from "@builder.io/qwik-city";
import { getUserByEmail } from "../db";

export const useSessionLoader = routeLoader$(({ cookie }) => {
  const sessionEmail = cookie.get("session_email")?.value;
  if (!sessionEmail) {
    return { loggedIn: false };
  }

  const user = getUserByEmail(sessionEmail);
  if (!user) {
    return { loggedIn: false };
  }

  return {
    loggedIn: true,
    user,
  };
});

export const useSessionAction = routeAction$((data, { cookie }) => {
  const action = data.action as string;
  if (action === "login") {
    const email = data.email as string;
    if (email) {
      cookie.set("session_email", email, { path: "/", httpOnly: true, sameSite: "strict" });
    }
  } else if (action === "logout") {
    cookie.delete("session_email", { path: "/" });
  }
});

export default component$(() => {
  const session = useSessionLoader();
  const sessionAction = useSessionAction();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>Qwik SQLite RBAC System</h1>
      
      <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px", marginBottom: "20px" }}>
        <h3>Current Authentication Status</h3>
        {session.value.loggedIn && session.value.user ? (
          <div>
            <p>Logged in as: <strong>{session.value.user.name}</strong> ({session.value.user.email})</p>
            <p>Role: <strong style={{ color: session.value.user.role === "ADMIN" ? "red" : "green" }}>{session.value.user.role}</strong></p>
            
            <Form action={sessionAction}>
              <input type="hidden" name="action" value="logout" />
              <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                Log Out
              </button>
            </Form>
          </div>
        ) : (
          <div>
            <p>Status: <strong>Unauthenticated</strong></p>
            <p>Select a user to log in:</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <Form action={sessionAction}>
                <input type="hidden" name="action" value="login" />
                <input type="hidden" name="email" value="admin@example.com" />
                <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#4caf50", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                  Log In as Admin
                </button>
              </Form>

              <Form action={sessionAction}>
                <input type="hidden" name="action" value="login" />
                <input type="hidden" name="email" value="user@example.com" />
                <button type="submit" style={{ padding: "8px 15px", backgroundColor: "#2196f3", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                  Log In as Regular User
                </button>
              </Form>
            </div>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px" }}>
        <h3>Navigation & Authorization Testing</h3>
        <ul style={{ paddingLeft: "20px", lineHeight: "2" }}>
          <li>
            <a href="/profile" style={{ color: "blue", textDecoration: "underline" }}>
              /profile
            </a>{" "}
            (Accessible to <strong>ADMIN</strong> and <strong>USER</strong>)
          </li>
          <li>
            <a href="/admin/users" style={{ color: "blue", textDecoration: "underline" }}>
              /admin/users
            </a>{" "}
            (Accessible only to <strong>ADMIN</strong>)
          </li>
          <li>
            <a href="/unauthorized" style={{ color: "blue", textDecoration: "underline" }}>
              /unauthorized
            </a>{" "}
            (Accessible to everyone)
          </li>
        </ul>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik SQLite RBAC System",
  meta: [
    {
      name: "description",
      content: "Role-Based Access Control System built with Qwik City and SQLite",
    },
  ],
};
