import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: 'red' }}>Access Denied</h1>
      <p>You do not have permission to access this page.</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Unauthorized',
};
