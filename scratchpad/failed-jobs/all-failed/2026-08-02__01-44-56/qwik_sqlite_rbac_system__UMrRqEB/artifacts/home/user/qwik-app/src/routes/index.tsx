import { component$ } from '@builder.io/qwik';
import { routeLoader$, routeAction$, Form, type DocumentHead } from '@builder.io/qwik-city';
import { getUserByEmail } from '../db';

export const useCurrentUser = routeLoader$((event) => {
  const sessionEmail = event.cookie.get('session_email')?.value;
  if (!sessionEmail) return null;
  return getUserByEmail(sessionEmail);
});

export const useLoginAction = routeAction$((data, event) => {
  const email = data.email as string;
  if (email) {
    event.cookie.set('session_email', email, { path: '/' });
  } else {
    event.cookie.delete('session_email', { path: '/' });
  }
  return { success: true };
});

export default component$(() => {
  const currentUser = useCurrentUser();
  const loginAction = useLoginAction();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Qwik SQLite RBAC System</h1>
      <p>Welcome to the Role-Based Access Control demo system.</p>

      <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
        <h2>Current Session Status</h2>
        {currentUser.value ? (
          <div>
            <p>You are logged in as <strong>{currentUser.value.name}</strong> (<code>{currentUser.value.email}</code>).</p>
            <p>Your role is: <strong>{currentUser.value.role}</strong></p>
            <Form action={loginAction}>
              <input type="hidden" name="email" value="" />
              <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>
                Logout
              </button>
            </Form>
          </div>
        ) : (
          <div>
            <p>You are currently <strong>not logged in</strong> (unauthenticated).</p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <Form action={loginAction}>
                <input type="hidden" name="email" value="admin@example.com" />
                <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Login as Admin
                </button>
              </Form>
              <Form action={loginAction}>
                <input type="hidden" name="email" value="user@example.com" />
                <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '4px' }}>
                  Login as Regular User
                </button>
              </Form>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <p>Or enter a custom email to test unlisted/unauthorized users:</p>
              <Form action={loginAction} style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="email" name="email" placeholder="guest@example.com" required style={{ padding: '0.5rem', width: '200px' }} />
                <button type="submit" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
                  Login with Custom Email
                </button>
              </Form>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2>Navigation & Routes</h2>
        <ul style={{ lineHeight: '2' }}>
          <li>
            <a href="/profile" style={{ color: '#3182ce', textDecoration: 'none', fontWeight: 'bold' }}>
              /profile
            </a>{' '}
            - Accessible by ADMIN and USER roles.
          </li>
          <li>
            <a href="/admin/users" style={{ color: '#3182ce', textDecoration: 'none', fontWeight: 'bold' }}>
              /admin/users
            </a>{' '}
            - Accessible only by ADMIN role.
          </li>
          <li>
            <a href="/unauthorized" style={{ color: '#3182ce', textDecoration: 'none', fontWeight: 'bold' }}>
              /unauthorized
            </a>{' '}
            - Publicly accessible.
          </li>
        </ul>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Qwik SQLite RBAC Demo',
};
