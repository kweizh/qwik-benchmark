import {
  $,
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

const POLL_INTERVAL_MS = 2000;

export default component$(() => {
  // Bump `tick` to force the metrics resource to re-fetch.
  const tick = useSignal(0);
  // Whether automatic polling is currently paused.
  const isPaused = useSignal(false);
  // Needed to build an absolute URL for `fetch` when this resource runs
  // during SSR (relative URLs are not valid there).
  const location = useLocation();

  const refresh = $(() => {
    tick.value++;
  });

  const metricsResource = useResource$<Metrics>(async ({ track, cleanup }) => {
    // Re-run this resource whenever `tick` changes (manual refresh or timer).
    track(() => tick.value);

    const controller = new AbortController();
    cleanup(() => controller.abort());

    const metricsUrl = new URL("/api/metrics", location.url).toString();
    const res = await fetch(metricsUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Failed to load metrics: HTTP ${res.status}`);
    }
    return (await res.json()) as Metrics;
  });

  // Sets up (and tears down) the polling timer. Reruns whenever the
  // pause/resume state changes so the interval is cleanly stopped and
  // restarted.
  useVisibleTask$(({ track, cleanup }) => {
    const paused = track(() => isPaused.value);

    if (paused) {
      // Do not start a timer while paused; nothing further to clean up.
      return;
    }

    const intervalId = setInterval(() => {
      tick.value++;
    }, POLL_INTERVAL_MS);

    cleanup(() => clearInterval(intervalId));
  });

  return (
    <div>
      <h1>Live Metrics Dashboard</h1>

      <div>
        <button data-testid="refresh-button" onClick$={refresh}>
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
        onPending={() => <div data-testid="metrics-pending">Loading metrics…</div>}
        onRejected={(error) => (
          <div data-testid="metrics-error">
            Error loading metrics: {error instanceof Error ? error.message : String(error)}
          </div>
        )}
        onResolved={(metrics) => (
          <div data-testid="metrics-resolved">
            <div data-testid="metric-request-count">
              Request Count: {metrics.requestCount}
            </div>
            <div data-testid="metric-cpu">CPU: {metrics.cpu}%</div>
            <div data-testid="metric-memory">Memory: {metrics.memory}%</div>
            <div data-testid="metric-active-users">
              Active Users: {metrics.activeUsers}
            </div>
            <div data-testid="metric-timestamp">
              Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      />
    </div>
  );
});

export const head: DocumentHead = {
  title: "Live Metrics Dashboard",
  meta: [
    {
      name: "description",
      content: "Live server metrics dashboard built with Qwik City",
    },
  ],
};
