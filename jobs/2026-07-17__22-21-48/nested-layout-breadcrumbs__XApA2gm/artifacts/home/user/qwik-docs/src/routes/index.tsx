import { component$ } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <h1>Qwik Docs</h1>
      <div>
        A self-contained documentation browser built with Qwik City.
        <br />
        <a href="/docs">Browse the documentation →</a>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Qwik Docs",
  meta: [
    {
      name: "description",
      content: "A documentation browser built with Qwik City.",
    },
  ],
};