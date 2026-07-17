import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form } from "@builder.io/qwik-city";
import { getUserByEmail, getAllUsers, updateUserRole } from "../../../db";

export const useAdminUsersLoader = routeLoader$(({ cookie, redirect, status }) => {
  const sessionEmail = cookie.get("session_email")?.value;
  if (!sessionEmail) {
    throw redirect(302, "/unauthorized");
  }

  const user = getUserByEmail(sessionEmail);
  if (!user || user.role !== "ADMIN") {
    throw redirect(302, "/unauthorized");
  }

  status(200);
  return getAllUsers();
});

export const useUpdateRoleAction = routeAction$((data, { cookie, status }) => {
  const sessionEmail = cookie.get("session_email")?.value;
  if (!sessionEmail) {
    status(403);
    return { success: false, error: "Unauthenticated" };
  }

  const performingUser = getUserByEmail(sessionEmail);
  if (!performingUser || performingUser.role !== "ADMIN") {
    status(403);
    return { success: false, error: "Unauthorized" };
  }

  const targetEmail = data.email as string;
  const targetRole = data.role as string;

  if (!targetEmail || !targetRole) {
    status(400);
    return { success: false, error: "Missing required fields" };
  }

  if (targetRole !== "ADMIN" && targetRole !== "USER") {
    status(400);
    return { success: false, error: "Invalid role" };
  }

  const updated = updateUserRole(targetEmail, targetRole);
  if (!updated) {
    status(404);
    return { success: false, error: "User not found" };
  }

  return { success: true };
});

export default component$(() => {
  const users = useAdminUsersLoader();
  const updateRoleAction = useUpdateRoleAction();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Admin - User Management</h1>
      
      {updateRoleAction.value?.success && (
        <div style={{ padding: "10px", backgroundColor: "#e6ffe6", border: "1px solid green", borderRadius: "5px", marginBottom: "15px", color: "green" }}>
          Role updated successfully!
        </div>
      )}

      {updateRoleAction.value?.error && (
        <div style={{ padding: "10px", backgroundColor: "#ffe6e6", border: "1px solid red", borderRadius: "5px", marginBottom: "15px", color: "red" }}>
          Error: {updateRoleAction.value.error}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2", textAlign: "left" }}>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>ID</th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Name</th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Email</th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Current Role</th>
            <th style={{ padding: "10px", border: "1px solid #ddd" }}>Update Role</th>
          </tr>
        </thead>
        <tbody>
          {users.value.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.id}</td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.name}</td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.email}</td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                <span style={{
                  padding: "3px 8px",
                  borderRadius: "3px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  backgroundColor: user.role === "ADMIN" ? "#ffe6cc" : "#e6f2ff",
                  color: user.role === "ADMIN" ? "#cc6600" : "#0066cc"
                }}>
                  {user.role}
                </span>
              </td>
              <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                <Form action={updateRoleAction} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input type="hidden" name="email" value={user.email} />
                  <select name="role" style={{ padding: "5px", borderRadius: "3px" }}>
                    <option value="USER" selected={user.role === "USER"}>USER</option>
                    <option value="ADMIN" selected={user.role === "ADMIN"}>ADMIN</option>
                  </select>
                  <button type="submit" style={{ padding: "5px 10px", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: "3px", cursor: "pointer" }}>
                    Update
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: "20px" }}>
        <a href="/" style={{ color: "blue", textDecoration: "underline" }}>Go back home</a>
      </p>
    </div>
  );
});
