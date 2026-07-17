import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { db } from '../../db';

export const useProfileLoader = routeLoader$(({ cookie, redirect }) => {
  const sessionEmail = cookie.get('session_email')?.value;
  if (!sessionEmail) {
    throw redirect(302, '/unauthorized');
  }

  const user = db.prepare('SELECT id, name, email, role FROM User WHERE email = ?').get(sessionEmail) as {
    id: number;
    name: string;
    email: string;
    role: string;
  } | undefined;

  if (!user || (user.role !== 'ADMIN' && user.role !== 'USER')) {
    throw redirect(302, '/unauthorized');
  }

  return user;
});

export default component$(() => {
  const profile = useProfileLoader();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '0.5rem' }}>User Profile</h1>
      <div style={{ backgroundColor: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: '0.5rem 0' }}><strong>ID:</strong> {profile.value.id}</p>
        <p style={{ margin: '0.5rem 0' }}><strong>Name:</strong> {profile.value.name}</p>
        <p style={{ margin: '0.5rem 0' }}><strong>Email:</strong> {profile.value.email}</p>
        <p style={{ margin: '0.5rem 0' }}><strong>Role:</strong> <span style={{ backgroundColor: '#0066cc', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>{profile.value.role}</span></p>
      </div>
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        {profile.value.role === 'ADMIN' && (
          <a href="/admin/users" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}>Admin Panel</a>
        )}
        <a href="/" style={{ color: '#666', textDecoration: 'none' }}>Home</a>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'User Profile',
};
