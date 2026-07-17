import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#d32f2f' }}>Access Denied</h1>
      <p>You are unauthorized to view this page.</p>
      <div style={{ marginTop: '2rem' }}>
        <a href="/profile" style={{ marginRight: '1rem', color: '#0066cc', textDecoration: 'none' }}>Go to Profile</a>
        <a href="/admin/users" style={{ color: '#0066cc', textDecoration: 'none' }}>Go to Admin Users</a>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Unauthorized - Access Denied',
};
