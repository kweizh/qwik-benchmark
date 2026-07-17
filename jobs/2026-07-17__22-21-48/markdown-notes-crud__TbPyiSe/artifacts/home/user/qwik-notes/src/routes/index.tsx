import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="layout">
      <h1>Markdown Notes</h1>
      <p>A minimal notes manager built with Qwik City and SQLite.</p>
      <p>
        <Link href="/notes" class="button primary">
          Go to notes &rarr;
        </Link>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Markdown Notes",
  meta: [
    {
      name: "description",
      content: "A Markdown notes manager built with Qwik City and SQLite.",
    },
  ],
};