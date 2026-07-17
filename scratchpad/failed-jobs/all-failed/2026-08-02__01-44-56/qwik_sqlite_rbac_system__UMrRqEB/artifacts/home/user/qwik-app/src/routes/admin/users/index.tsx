import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form, type DocumentHead } from '@builder.io/qwik-city';
import { getUserByEmail, getAllUsers, updateUserRole } from '../../../db';

export const useUsersList = routeLoader$((event) => {
  const sessionEmail = event.cookie.get('session_email')?.value;
  if (!sessionEmail) {
    throw event.redirect(302, '/unauthorized');
  }

  const user = getUserByEmail(sessionEmail);
  if (!user || user.role !== 'ADMIN') {
    throw event.redirect(302, '/unauthorized');
  }

  return getAllUsers();
});

export const useUpdateRole = routeAction$((data, event) => {
  const sessionEmail = event.cookie.get('session_email')?.value;
  if (!sessionEmail) {
    event.status(403);
    return { success: false, error: 'Unauthenticated' };
  }

  const performingUser = getUserByEmail(sessionEmail);
  if (!performingUser || performingUser.role !== 'ADMIN') {
    event.status(403);
    return { success: false, error: 'Unauthorized' };
  }

  const targetEmail = data.email as string;
  const targetRole = data.role as string;

  if (!targetEmail || !targetRole) {
    return { success: false, error: 'Missing email or role' };
  }

  const updated = updateUserRole(targetEmail, targetRole);
  if (!updated) {
    return { success: false, error: 'User not found' };
  }

  return { success: true };
});

export default component$(() => {
  const users = useUsersList();
  const updateRoleAction = useUpdateRole();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Admin User Management</h1>
      
      {updateRoleAction.value?.success === false && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {updateRoleAction.value.error}
        </div>
      )}

      {updateRoleAction.value?.success === true && (
        <div style={{ color: 'green', marginBottom: '1rem' }}>
          Role updated successfully!
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>ID</th>
            <th style={{ padding: '0.5rem' }}>Name</th>
            <th style={{ padding: '0.5rem' }}>Email</th>
            <th style={{ padding: '0.5rem' }}>Current Role</th>
            <th style={{ padding: '0.5rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.value.map((user) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.5rem' }}>{user.id}</td>
              <td style={{ padding: '0.5rem' }}>{user.name}</td>
              <td style={{ padding: '0.5rem' }}>{user.email}</td>
              <td style={{ padding: '0.5rem' }}>{user.role}</td>
              <td style={{ padding: '0.5rem' }}>
                <Form action={updateRoleAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="hidden" name="email" value={user.email} />
                  <select name="role" style={{ padding: '0.25rem' }}>
                    <option value="USER" selected={user.role === 'USER'}>USER</option>
                    <option value="ADMIN" selected={user.role === 'ADMIN'}>ADMIN</option>
                  </select>
                  <button type="submit" style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}>
                    Update Role
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Admin User Management',
};
