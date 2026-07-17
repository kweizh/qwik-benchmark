import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#e53e3e' }}>Access Denied</h1>
      <p>You are unauthorized to view this page.</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Unauthorized',
};
