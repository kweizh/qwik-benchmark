import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Dashboard } from "~/components/dashboard/dashboard";

export default component$(() => {
  return <Dashboard />;
});

export const head: DocumentHead = {
  title: "Live Metrics Dashboard",
  meta: [
    {
      name: "description",
      content:
        "Real-time server metrics dashboard built with Qwik City.",
    },
  ],
};