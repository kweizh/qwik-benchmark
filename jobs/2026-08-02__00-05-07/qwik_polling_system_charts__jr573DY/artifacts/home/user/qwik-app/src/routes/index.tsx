import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <h1>Polls</h1>
      <ul>
        <li>
          <Link href="/poll/frameworks/">
            What is your favorite frontend framework?
          </Link>
        </li>
        <li>
          <Link href="/poll/colors/">
            What is your favorite primary color?
          </Link>
        </li>
      </ul>
    </>
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
