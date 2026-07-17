import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getAuthenticatedUser } from '../../auth';

export const useProfileLoader = routeLoader$((event) => {
  const user = getAuthenticatedUser(event);
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
  const profile = useProfileLoader();
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>User Profile</h1>
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', maxWidth: '400px' }}>
        <p><strong>Name:</strong> <span id="profile-name">{profile.value.name}</span></p>
        <p><strong>Email:</strong> <span id="profile-email">{profile.value.email}</span></p>
        <p><strong>Role:</strong> <span id="profile-role">{profile.value.role}</span></p>
      </div>
    </div>
  );
});
