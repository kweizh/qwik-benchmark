import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form } from '@builder.io/qwik-city';
import { getAuthenticatedUser } from '../../../auth';
import { getAllUsers, updateUserRole } from '../../../db';

export const useUsersLoader = routeLoader$((event) => {
  const user = getAuthenticatedUser(event);
  if (!user || user.role !== 'ADMIN') {
    throw event.redirect(302, '/unauthorized');
  }
  return getAllUsers();
});

export const useUpdateRoleAction = routeAction$((data, event) => {
  const performingUser = getAuthenticatedUser(event);
  if (!performingUser || performingUser.role !== 'ADMIN') {
    event.status(403);
    return { success: false, error: 'Unauthorized' };
  }

  const email = data.email as string;
  const role = data.role as string;

  if (!email || !role) {
    event.status(400);
    return { success: false, error: 'Email and role are required' };
  }

  const success = updateUserRole(email, role);
  if (!success) {
    event.status(404);
    return { success: false, error: 'User not found' };
  }

  return { success: true };
});

export default component$(() => {
  const users = useUsersLoader();
  const action = useUpdateRoleAction();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Admin - User Management</h1>
      
      <h2>Users List</h2>
      <table border="1" cellPadding={8} style={{ borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {users.value.map((user) => (
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
      <Form action={action} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ display: 'block' }}>User Email:</label>
          <input type="email" name="email" required style={{ width: '100%', padding: '5px' }} />
        </div>
        <div>
          <label style={{ display: 'block' }}>New Role:</label>
          <select name="role" required style={{ width: '100%', padding: '5px' }}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>Update Role</button>
      </Form>

      {action.value?.success && (
        <p style={{ color: 'green', marginTop: '10px' }} id="success-msg">Role updated successfully!</p>
      )}
      {action.value?.error && (
        <p style={{ color: 'red', marginTop: '10px' }} id="error-msg">{action.value.error}</p>
      )}
    </div>
  );
});
