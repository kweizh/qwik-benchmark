import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const count = useSignal<number>(0);

  // Client-only: open an EventSource subscription to the SSE endpoint and
  // keep `count` in sync with every broadcast update. Closed on cleanup.
  useVisibleTask$(({ cleanup }) => {
    const source = new EventSource("/api/counter/stream");

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { count: number };
        count.value = data.count;
      } catch {
        // Ignore malformed frames.
      }
    };

    cleanup(() => {
      source.close();
    });
  });

  const sendDelta = $(async (delta: number) => {
    await fetch("/api/counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    // No need to update `count` here directly: the SSE stream will push
    // the authoritative new value to every connected client, including
    // this one.
  });

  return (
    <>
      <h1>Live Shared Counter</h1>
      <p>
        Value: <span id="counter-value">{count.value}</span>
      </p>
      <button onClick$={() => sendDelta(-1)}>-1</button>
      <button onClick$={() => sendDelta(1)}>+1</button>
    </>
  );
});

export const head: DocumentHead = {
  title: "Live Shared Counter",
  meta: [
    {
      name: "description",
      content: "A real-time shared counter over Server-Sent Events.",
    },
  ],
};
