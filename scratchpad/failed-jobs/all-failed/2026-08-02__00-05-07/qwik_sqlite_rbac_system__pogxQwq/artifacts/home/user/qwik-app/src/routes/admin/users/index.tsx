import { component$ } from "@builder.io/qwik";
import { Form, routeAction$, routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { getSessionUser } from "~/lib/auth";
import { getAllUsers, updateUserRole } from "~/lib/db";

export const useAdminUsersLoader = routeLoader$(async (requestEvent) => {
  const currentUser = getSessionUser(requestEvent.cookie);

  if (!currentUser || currentUser.role !== "ADMIN") {
    throw requestEvent.redirect(302, "/unauthorized");
  }

  requestEvent.status(200);

  return {
    currentUserEmail: currentUser.email,
    users: getAllUsers(),
  };
});

export const useUpdateRoleAction = routeAction$(async (data, requestEvent) => {
  // Authorization check: only an authenticated ADMIN may perform this action.
  const currentUser = getSessionUser(requestEvent.cookie);
  if (!currentUser || currentUser.role !== "ADMIN") {
    return requestEvent.fail(403, {
      message: "Forbidden: administrator role required.",
    });
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";
  const role = typeof data.role === "string" ? data.role.trim() : "";

  if (!email || !role) {
    return requestEvent.fail(400, {
      message: "Both email and role fields are required.",
    });
  }

  const updated = updateUserRole(email, role);
  if (!updated) {
    return requestEvent.fail(404, {
      message: `No user found with email "${email}".`,
    });
  }

  return {
    success: true as const,
    email,
    role,
  };
});

export default component$(() => {
  const admin = useAdminUsersLoader();
  const updateRole = useUpdateRoleAction();

  return (
    <div>
      <h1>User Management</h1>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {admin.value.users.map((user) => (
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
      <Form action={updateRole}>
        <label>
          Email
          <select name="email">
            {admin.value.users.map((user) => (
              <option key={user.id} value={user.email}>
                {user.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          Role
          <select name="role">
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
        </label>

        <button type="submit">Update Role</button>
      </Form>

      {updateRole.value?.success && (
        <p>
          Updated {updateRole.value.email} to role {updateRole.value.role}.
        </p>
      )}
      {updateRole.value && "failed" in updateRole.value && updateRole.value.failed && (
        <p>Error: {(updateRole.value as { message?: string }).message}</p>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin - Users",
};
