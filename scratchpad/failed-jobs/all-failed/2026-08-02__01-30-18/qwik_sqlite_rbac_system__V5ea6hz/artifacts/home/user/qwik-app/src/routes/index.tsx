import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, type DocumentHead } from "@builder.io/qwik-city";
import { db } from "../db";

export const useSessionLoader = routeLoader$(({ cookie }) => {
  const sessionEmail = cookie.get('session_email')?.value;
  if (!sessionEmail) {
    return { user: null };
  }

  const user = db.prepare('SELECT id, name, email, role FROM User WHERE email = ?').get(sessionEmail) as {
    id: number;
    name: string;
    email: string;
    role: string;
  } | undefined;

  return { user: user || null };
});

export const useLoginAction = routeAction$((data, { cookie }) => {
  const email = data.email;
  if (email && typeof email === 'string') {
    cookie.set('session_email', email.trim(), { path: '/' });
  }
  return { success: true };
});

export const useLogoutAction = routeAction$((_data, { cookie }) => {
  cookie.delete('session_email', { path: '/' });
  return { success: true };
});

export default component$(() => {
  const session = useSessionLoader();
  const loginAction = useLoginAction();
  const logoutAction = useLogoutAction();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Qwik SQLite RBAC System</h1>
      <p style={{ color: '#666' }}>
        Welcome to the Role-Based Access Control (RBAC) demonstration.
      </p>

      <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eaeaea', marginTop: '1.5rem' }}>
        <h2>Current Session Status</h2>
        {session.value.user ? (
          <div>
            <p>You are logged in as:</p>
            <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #eaeaea', marginBottom: '1rem' }}>
              <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {session.value.user.name}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>Email:</strong> {session.value.user.email}</p>
              <p style={{ margin: '0.25rem 0' }}><strong>Role:</strong> <span style={{ backgroundColor: '#0066cc', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem' }}>{session.value.user.role}</span></p>
            </div>
            <Form action={logoutAction}>
              <button type="submit" style={{
                backgroundColor: '#d32f2f',
                color: '#fff',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Logout
              </button>
            </Form>
          </div>
        ) : (
          <div>
            <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>Unauthenticated</p>
            <p>Choose a user to log in as:</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Form action={loginAction}>
                <input type="hidden" name="email" value="admin@example.com" />
                <button type="submit" style={{
                  backgroundColor: '#2e7d32',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Login as Admin
                </button>
              </Form>

              <Form action={loginAction}>
                <input type="hidden" name="email" value="user@example.com" />
                <button type="submit" style={{
                  backgroundColor: '#0066cc',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Login as User
                </button>
              </Form>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', borderTop: '1px solid #eaeaea', paddingTop: '1.5rem' }}>
        <a href="/profile" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>View /profile Route</a>
        <a href="/admin/users" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>View /admin/users Route</a>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik SQLite RBAC System",
  meta: [
    {
      name: "description",
      content: "Role-Based Access Control system with Qwik and SQLite",
    },
  ],
};
