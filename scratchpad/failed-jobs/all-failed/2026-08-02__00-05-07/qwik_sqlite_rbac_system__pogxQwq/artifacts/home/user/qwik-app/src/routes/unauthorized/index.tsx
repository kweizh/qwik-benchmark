import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div>
      <h1>Access Denied</h1>
      <p>You are not authorized to view this page.</p>
      <p>
        <a href="/">Go back home</a>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Unauthorized",
};
