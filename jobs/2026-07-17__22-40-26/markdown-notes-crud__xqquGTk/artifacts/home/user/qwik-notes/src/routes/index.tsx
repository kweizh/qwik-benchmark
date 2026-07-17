import { component$ } from "@builder.io/qwik";
import { Link, type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <section class="hero">
      <h1>Markdown Notes</h1>
      <p>
        A tiny notes app built with <strong>Qwik City</strong> and a local
        SQLite database. Notes are written in Markdown and rendered as
        sanitized HTML on the server.
      </p>
      <p>
        <Link href="/notes" class="button primary">
          Go to my notes →
        </Link>
      </p>
    </section>
  );
});

export const head: DocumentHead = {
  title: "Markdown Notes",
  meta: [
    {
      name: "description",
      content: "A local-first Markdown notes manager built with Qwik City.",
    },
  ],
};