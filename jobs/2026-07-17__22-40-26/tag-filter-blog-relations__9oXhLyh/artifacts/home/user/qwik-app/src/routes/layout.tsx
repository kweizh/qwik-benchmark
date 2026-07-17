import { component$, Slot } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';

export default component$(() => {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/articles">Articles</Link>
      </nav>
      <main>
        <Slot />
      </main>
    </>
  );
});