import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  Form,
  type DocumentHead,
  type RequestHandler,
} from "@builder.io/qwik-city";
import { getSessionUser } from "~/lib/session";
import { getAllUsers, updateUserRole } from "~/lib/db";

export const onRequest: RequestHandler = (requestEvent) => {
  const user = getSessionUser(requestEvent);
  if (!user || user.role !== "ADMIN") {
    throw requestEvent.redirect(302, "/unauthorized");
  }
};

export const useUsers = routeLoader$(() => {
  return getAllUsers();
});

export const useUpdateRole = routeAction$((data, requestEvent) => {
  // Verify the performing user is an ADMIN
  const performingUser = getSessionUser(requestEvent);
  if (!performingUser || performingUser.role !== "ADMIN") {
    return {
      success: false,
      message: "Unauthorized: only admins can update roles.",
    };
  }

  const email = data.email as string;
  const role = data.role as string;

  if (!email || !role) {
    return {
      success: false,
      message: "Email and role are required.",
    };
  }

  if (role !== "ADMIN" && role !== "USER") {
    return {
      success: false,
      message: 'Role must be either "ADMIN" or "USER".',
    };
  }

  const updated = updateUserRole(email, role);
  if (!updated) {
    return {
      success: false,
      message: `User with email "${email}" not found.`,
    };
  }

  return {
    success: true,
    message: `Role for ${email} updated to ${role}.`,
  };
});

export default component$(() => {
  const usersSignal = useUsers();
  const action = useUpdateRole();

  return (
    <div>
      <h1>Admin - User Management</h1>

      <h2>All Users</h2>
      <table border="1" cellPadding="8" cellSpacing="0">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {usersSignal.value.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Update User Role</h2>
      <Form action={action}>
        <div>
          <label>
            Email:
            <input type="email" name="email" required />
          </label>
        </div>
        <div>
          <label>
            Role:
            <select name="role" required>
              <option value="">-- Select Role --</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </label>
        </div>
        <div>
          <button type="submit">Update Role</button>
        </div>
      </Form>

      {action.value && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: action.value.success ? "#d4edda" : "#f8d7da",
            border: "1px solid",
            borderColor: action.value.success ? "#c3e6cb" : "#f5c6cb",
            borderRadius: "4px",
          }}
        >
          {action.value.message}
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin - User Management",
};
