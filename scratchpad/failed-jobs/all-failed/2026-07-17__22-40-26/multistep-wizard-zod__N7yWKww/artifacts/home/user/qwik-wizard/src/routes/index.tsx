import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <main>
      <h1>Qwik Multi-Step Registration Wizard</h1>
      <p>
        This is a server-rendered, progressively-enhanced registration flow built
        with Qwik City, Zod, and a local SQLite database. Each step is validated
        on the server.
      </p>
      <p>
        <a href="/register/">Start the registration →</a>
      </p>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Qwik Wizard",
  meta: [
    {
      name: "description",
      content: "Multi-step registration wizard built with Qwik City",
    },
  ],
};