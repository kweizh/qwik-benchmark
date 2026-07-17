import { component$ } from '@builder.io/qwik';
import { routeLoader$, type DocumentHead } from '@builder.io/qwik-city';
import { getUserByEmail } from '../../db';

export const useUserProfile = routeLoader$((event) => {
  const sessionEmail = event.cookie.get('session_email')?.value;
  if (!sessionEmail) {
    throw event.redirect(302, '/unauthorized');
  }

  const user = getUserByEmail(sessionEmail);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'USER')) {
    throw event.redirect(302, '/unauthorized');
  }

  return {
    name: user.name,
    email: user.email,
    role: user.role,
  };
});

export default component$(() => {
  const profile = useUserProfile();

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>User Profile</h1>
      <div style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', maxWidth: '400px' }}>
        <p><strong>Name:</strong> {profile.value.name}</p>
        <p><strong>Email:</strong> {profile.value.email}</p>
        <p><strong>Role:</strong> {profile.value.role}</p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'User Profile',
};
