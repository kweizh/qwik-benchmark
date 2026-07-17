// Home page: subscribes to the SSE counter stream, renders the latest value
// inside an element with id="counter-value", and lets the user mutate the
// counter locally. The whole subscription is wired up in a visible task so
// it only runs in the browser, and the cleanup callback closes the
// EventSource when the component is torn down.
import {
  $,
  component$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  // Reactive holder for the latest counter value we have observed over SSE.
  const count = useSignal(0);
  // User-supplied delta for the +/- buttons.
  const delta = useSignal(1);

  // Browser-only subscription. useVisibleTask$ runs once the component is
  // mounted in the DOM, so EventSource (a browser-only API) is safe here.
  // The cleanup callback is invoked when the component is destroyed.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const url = "/api/counter/stream";
    const source = new EventSource(url);

    source.onopen = () => {
      // Connection is established; nothing else to do. The server pushes an
      // initial frame as soon as we register, so the first `count` event
      // below will deliver the current value.
    };

    source.onerror = () => {
      // EventSource auto-reconnects on transient errors. We don't need to
      // do anything explicit; if the connection is permanently down (e.g.
      // server stopped) the EventSource will keep retrying in the
      // background and the user will see the last successful value until
      // a new one arrives.
    };

    source.onmessage = (event: MessageEvent<string>) => {
      // The server emits frames as `data: {"count": <int>}\n\n`. Parse the
      // payload and update our signal so the DOM re-renders.
      try {
        const payload = JSON.parse(event.data) as { count: number };
        if (typeof payload.count === "number") {
          count.value = payload.count;
        }
      } catch {
        // Ignore malformed frames; the next broadcast will overwrite.
      }
    };

    // When the component is destroyed (route change, full-page reload, etc.)
    // we tear down the EventSource so the browser doesn't keep the
    // connection alive in the background.
    cleanup(() => {
      source.close();
    });
  });

  // Click handlers that POST a signed delta to /api/counter. Optimistically
  // apply the delta locally so the UI feels snappy; the SSE stream will
  // confirm the new value (and broadcast it to every other client).
  const adjust = $(async (sign: 1 | -1) => {
    const effectiveDelta = sign * Math.trunc(Number(delta.value) || 0);
    if (effectiveDelta === 0) return;
    try {
      await fetch("/api/counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: effectiveDelta }),
      });
    } catch {
      // Swallow network errors here; the SSE stream is the source of truth
      // and will redisplay whatever value the server eventually settles on.
    }
  });

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Live Shared Counter</h1>
      <p style={{ fontSize: "1rem", color: "#555" }}>
        This counter is shared across every connected browser. Open this page
        in multiple tabs or windows and try clicking the buttons &mdash; all
        windows update together.
      </p>

      <div
        style={{
          margin: "1.5rem 0",
          padding: "1.5rem",
          border: "1px solid #ddd",
          borderRadius: "8px",
          display: "inline-block",
          minWidth: "320px",
          background: "#fafafa",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "#777" }}>Current value</div>
        <div
          id="counter-value"
          data-testid="counter-value"
          style={{
            fontSize: "4rem",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.1,
          }}
        >
          {count.value}
        </div>

        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          <input
            type="number"
            value={delta.value}
            onInput$={(_, el) => {
              delta.value = Number(el.value);
            }}
            style={{ width: "6rem", padding: "0.4rem" }}
          />
          <button onClick$={() => adjust(-1)} style={{ padding: "0.4rem 1rem" }}>
            -
          </button>
          <button onClick$={() => adjust(1)} style={{ padding: "0.4rem 1rem" }}>
            +
          </button>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", color: "#888" }}>
        Updates flow over a Server-Sent Events stream from{" "}
        <code>GET /api/counter/stream</code>. Mutations are sent to{" "}
        <code>POST /api/counter</code> with a JSON body of{" "}
        <code>{`{ "delta": <int> }`}</code>.
      </p>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Live Shared Counter (SSE)",
  meta: [
    {
      name: "description",
      content:
        "A Qwik City app showing a shared counter pushed to the browser over Server-Sent Events.",
    },
  ],
};
