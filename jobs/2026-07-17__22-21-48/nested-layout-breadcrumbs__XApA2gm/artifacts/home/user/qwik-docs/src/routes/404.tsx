import { component$ } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <section>
      <h1>404 — Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <a href="/docs">Go to the documentation index</a>
      </p>
    </section>
  );
});

export const head: DocumentHead = {
  title: "404 — Not Found",
};