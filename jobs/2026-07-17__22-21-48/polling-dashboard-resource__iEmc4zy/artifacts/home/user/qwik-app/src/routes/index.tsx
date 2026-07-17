import {
  component$,
  useResource$,
  useSignal,
  useVisibleTask$,
  Resource,
} from "@builder.io/qwik";
import { useLocation, type DocumentHead } from "@builder.io/qwik-city";

interface Metrics {
  requestCount: number;
  cpu: number;
  memory: number;
  activeUsers: number;
  timestamp: number;
}

const POLL_INTERVAL = 2000;

export default component$(() => {
  // Reactive "tick" signal. Tracking it inside the resource forces a re-fetch
  // whenever it changes (from the timer or the manual refresh button).
  const tick = useSignal(0);
  // Pause/resume state for automatic polling.
  const isPaused = useSignal(false);

  // The request URL is available during SSR so we can build an absolute URL
  // for fetch (Node's fetch rejects relative URLs). On the client this resolves
  // against the current document URL.
  const location = useLocation();

  const metricsResource = useResource$<Metrics>(async ({ track }) => {
    // Track the tick so changing it re-triggers this resource.
    track(() => tick.value);
    const url = new URL("/api/metrics", location.url);
    const res = await fetch(url.href);
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return (await res.json()) as Metrics;
  });

  // Automatic polling via a visible task timer. The interval is gated on the
  // pause/resume state and is cleaned up in the task cleanup callback so no
  // timers leak.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => isPaused.value);

    if (isPaused.value) {
      return;
    }

    const id = setInterval(() => {
      tick.value++;
    }, POLL_INTERVAL);

    cleanup(() => clearInterval(id));
  });

  return (
    <main>
      <h1>Live Metrics Dashboard</h1>

      <div>
        <button
          data-testid="refresh-button"
          onClick$={() => {
            tick.value++;
          }}
        >
          Refresh
        </button>
        <button
          data-testid="toggle-button"
          onClick$={() => {
            isPaused.value = !isPaused.value;
          }}
        >
          {isPaused.value ? "Resume" : "Pause"}
        </button>
      </div>

      <Resource
        value={metricsResource}
        onPending={() => <p data-testid="pending">Loading metrics…</p>}
        onRejected={(error) => (
          <p data-testid="rejected">Error: {error.message}</p>
        )}
        onResolved={(metrics) => (
          <section data-testid="resolved">
            <p data-testid="metric-request-count">
              Request Count: {metrics.requestCount}
            </p>
            <p data-testid="metric-cpu">CPU: {metrics.cpu}</p>
            <p data-testid="metric-memory">Memory: {metrics.memory}</p>
            <p data-testid="metric-active-users">
              Active Users: {metrics.activeUsers}
            </p>
          </section>
        )}
      />
    </main>
  );
});

export const head: DocumentHead = {
  title: "Live Metrics Dashboard",
  meta: [
    {
      name: "description",
      content: "Real-time server metrics dashboard built with Qwik City.",
    },
  ],
};