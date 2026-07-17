import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="wizard-page">
      <div class="wizard-card">
        <h1>Welcome 👋</h1>
        <p class="subtitle">
          A multi-step registration wizard built with Qwik City, Zod and
          SQLite.
        </p>
        <a class="btn-primary" style="text-decoration:none; text-align:center;" href="/register/">
          Start registration
        </a>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
