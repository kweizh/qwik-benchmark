import {
  component$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getCount } from "~/server/counter-store";

/**
 * Server-side loader: reads the current shared counter value during SSR so the
 * page is rendered with the real current value (rather than a stale default).
 * The value is serialized to the client and used to seed the reactive signal.
 */
export const useCurrentCount = routeLoader$(() => {
  return getCount();
});

export default component$(() => {
  // Reactive state seeded with the server-known current counter value.
  const initial = useCurrentCount();
  const count = useSignal(initial.value);

  // Browser-only visible task: subscribe to the SSE stream via EventSource.
  useVisibleTask$(async ({ cleanup }) => {
    const eventSource = new EventSource("/api/counter/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { count?: unknown };
        if (typeof data.count === "number" && Number.isFinite(data.count)) {
          count.value = Math.trunc(data.count);
        }
      } catch {
        // Ignore malformed frames.
      }
    };

    // Close the stream connection when the component is destroyed.
    cleanup(() => {
      eventSource.close();
    });
  });

  return (
    <main
      style={{
        "font-family": "system-ui, sans-serif",
        "text-align": "center",
        "margin-top": "4rem",
      }}
    >
      <h1>Live Shared Counter</h1>
      <p>Real-time counter shared across every connected browser via SSE.</p>

      <div
        id="counter-value"
        style={{
          "font-size": "4rem",
          "font-variant-numeric": "tabular-nums",
          margin: "1rem 0",
        }}
      >
        {count.value}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          "justify-content": "center",
        }}
      >
        <button
          onClick$={async () => {
            await fetch("/api/counter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ delta: -1 }),
            });
          }}
        >
          − Decrement
        </button>
        <button
          onClick$={async () => {
            await fetch("/api/counter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ delta: 1 }),
            });
          }}
        >
          + Increment
        </button>
      </div>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Live Shared Counter",
  meta: [
    {
      name: "description",
      content: "Real-time shared counter over Server-Sent Events",
    },
  ],
};