import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div>
      <h1>Unauthorized</h1>
      <p>Access Denied: You do not have permission to view this page.</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Unauthorized",
};
