import { component$ } from '@builder.io/qwik';
import { Link, type DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <div>
      <h1>Qwik Tag-Filterable Blog</h1>
      <p>
        Visit the <Link href="/articles">articles listing</Link> to filter by tag.
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Qwik Blog',
};