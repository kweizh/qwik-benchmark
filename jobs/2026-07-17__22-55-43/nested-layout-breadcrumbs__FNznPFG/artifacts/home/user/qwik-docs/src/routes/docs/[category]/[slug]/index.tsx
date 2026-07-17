import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { usePageData } from "./layout";

export default component$(() => {
  const page = usePageData();

  return (
    <article>
      <h1>{page.value.title}</h1>
      <p>{page.value.body}</p>
    </article>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const page = resolveValue(usePageData);
  return {
    title: page.title,
  };
};
