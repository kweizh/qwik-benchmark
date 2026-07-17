import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form, type DocumentHead } from '@builder.io/qwik-city';
import { db } from '../../../db';

export const useUsersLoader = routeLoader$(({ cookie, redirect }) => {
  const sessionEmail = cookie.get('session_email')?.value;
  if (!sessionEmail) {
    throw redirect(302, '/unauthorized');
  }

  const user = db.prepare('SELECT role FROM User WHERE email = ?').get(sessionEmail) as { role: string } | undefined;
  if (!user || user.role !== 'ADMIN') {
    throw redirect(302, '/unauthorized');
  }

  const allUsers = db.prepare('SELECT id, name, email, role FROM User').all() as {
    id: number;
    name: string;
    email: string;
    role: string;
  }[];

  return allUsers;
});

export const useUpdateRoleAction = routeAction$(async (data, { cookie, fail }) => {
  const sessionEmail = cookie.get('session_email')?.value;
  if (!sessionEmail) {
    return fail(403, { error: 'Unauthorized' });
  }

  const performingUser = db.prepare('SELECT role FROM User WHERE email = ?').get(sessionEmail) as { role: string } | undefined;
  if (!performingUser || performingUser.role !== 'ADMIN') {
    return fail(403, { error: 'Unauthorized' });
  }

  const email = data.email;
  const role = data.role;

  if (!email || typeof email !== 'string' || !role || typeof role !== 'string') {
    return fail(400, { error: 'Missing or invalid email or role' });
  }

  const targetEmail = email.trim();
  const targetRole = role.trim();

  if (targetRole !== 'ADMIN' && targetRole !== 'USER') {
    return fail(400, { error: 'Invalid role' });
  }

  const result = db.prepare('UPDATE User SET role = ? WHERE email = ?').run(targetRole, targetEmail);
  if (result.changes === 0) {
    return fail(404, { error: 'User not found' });
  }

  return { success: true };
});

export default component$(() => {
  const users = useUsersLoader();
  const action = useUpdateRoleAction();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '0.5rem' }}>Admin - User Management</h1>

      {action.value && action.value.failed && (
        <div style={{ backgroundColor: '#fde8e8', color: '#e53e3e', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold' }}>
          Error: {action.value.error || 'Failed to update role'}
        </div>
      )}

      {action.value && !action.value.failed && action.value.success && (
        <div style={{ backgroundColor: '#def7ec', color: '#03543f', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold' }}>
          Role updated successfully!
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #eaeaea' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Role</th>
            <th style={{ padding: '0.75rem', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.value.map((user) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eaeaea' }}>
              <td style={{ padding: '0.75rem' }}>{user.id}</td>
              <td style={{ padding: '0.75rem' }}>{user.name}</td>
              <td style={{ padding: '0.75rem' }}>{user.email}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  backgroundColor: user.role === 'ADMIN' ? '#c5f2c7' : '#e1f5fe',
                  color: user.role === 'ADMIN' ? '#1b5e20' : '#01579b',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>
                  {user.role}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                <Form action={action} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0 }}>
                  <input type="hidden" name="email" value={user.email} />
                  <select name="role" value={user.role} style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <button type="submit" style={{
                    backgroundColor: '#0066cc',
                    color: '#fff',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}>
                    Update
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eaeaea' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Update User Role Form</h2>
        <Form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="user@example.com"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>New Role</label>
            <select
              name="role"
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <button type="submit" style={{
            backgroundColor: '#0066cc',
            color: '#fff',
            border: 'none',
            padding: '0.6rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            Submit Role Update
          </button>
        </Form>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a href="/profile" style={{ color: '#666', textDecoration: 'none' }}>Go to Profile</a>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Admin - User Management',
};
