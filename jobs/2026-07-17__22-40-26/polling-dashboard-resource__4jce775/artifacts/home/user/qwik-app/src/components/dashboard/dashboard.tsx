import {
  component$,
  useSignal,
  useResource$,
  useVisibleTask$,
  Resource,
  $,
} from "@builder.io/qwik";

export interface Metrics {
  requestCount: number;
  cpu: number;
  memory: number;
  activeUsers: number;
  timestamp: number;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Builds the metrics endpoint URL. During SSR (no `window`) we hit the
 * local dev server over loopback so the resource can be resolved before
 * the initial HTML is flushed to the client. On the browser we just
 * use a same-origin relative URL.
 */
function metricsUrl(): string {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:3000/api/metrics";
  }
  return "/api/metrics";
}

export const Dashboard = component$(() => {
  // Reactive "tick" that drives the polling cadence. Bumping this value
  // re-triggers the `useResource$` (because we `track` it).
  const tick = useSignal(0);

  // When true the visible task does not start a polling interval.
  const isPaused = useSignal(false);

  const metricsResource = useResource$<Metrics>(async ({ track, cleanup }) => {
    // Re-run whenever the tick changes (manual refresh or polling).
    track(() => tick.value);
    // Also re-run whenever the pause/resume state changes so that the
    // pending/resolved UI immediately reflects a manual refresh after
    // resuming.
    track(() => isPaused.value);

    const controller = new AbortController();
    cleanup(() => controller.abort());

    const res = await fetch(metricsUrl(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch metrics: HTTP ${res.status}`);
    }
    return (await res.json()) as Metrics;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    // Track pause state so the task re-runs when the user toggles it,
    // tearing down the previous interval (cleanup) and starting a fresh
    // one when polling is resumed.
    const paused = track(() => isPaused.value);

    if (paused) {
      // No timer should run while paused.
      return;
    }

    const interval = setInterval(() => {
      // Defensive check: don't schedule work if the user paused between
      // ticks (e.g. across task re-runs).
      if (!isPaused.value) {
        tick.value += 1;
      }
    }, POLL_INTERVAL_MS);

    cleanup(() => clearInterval(interval));
  });

  const handleRefresh = $(() => {
    tick.value += 1;
  });

  const handleToggle = $(() => {
    isPaused.value = !isPaused.value;
  });

  return (
    <main class="dashboard">
      <header>
        <h1>Live Metrics Dashboard</h1>
        <p class="subtitle">Server metrics polled every 2 seconds.</p>
      </header>

      <Resource
        value={metricsResource}
        onPending={() => (
          <div class="metrics metrics--pending" data-state="pending">
            <p>Loading metrics…</p>
          </div>
        )}
        onResolved={(metrics) => (
          <section class="metrics" data-state="resolved">
            <article class="metric-card">
              <h2>Requests</h2>
              <p data-testid="metric-request-count">
                {String(metrics.requestCount)}
              </p>
            </article>
            <article class="metric-card">
              <h2>CPU</h2>
              <p data-testid="metric-cpu">{metrics.cpu}%</p>
            </article>
            <article class="metric-card">
              <h2>Memory</h2>
              <p data-testid="metric-memory">{metrics.memory}%</p>
            </article>
            <article class="metric-card">
              <h2>Active Users</h2>
              <p data-testid="metric-active-users">
                {String(metrics.activeUsers)}
              </p>
            </article>
            <p class="timestamp">
              Last updated: {new Date(metrics.timestamp).toISOString()}
            </p>
          </section>
        )}
        onRejected={(error) => (
          <div class="metrics metrics--error" data-state="rejected">
            <p>Failed to load metrics.</p>
            <p class="error-message">{error.message}</p>
          </div>
        )}
      />

      <div class="controls">
        <button
          type="button"
          data-testid="refresh-button"
          onClick$={handleRefresh}
        >
          Refresh now
        </button>
        <button
          type="button"
          data-testid="toggle-button"
          aria-pressed={isPaused.value ? "true" : "false"}
          onClick$={handleToggle}
        >
          {isPaused.value ? "Resume polling" : "Pause polling"}
        </button>
        <span class="status">
          {isPaused.value ? "Polling paused" : "Polling active"}
        </span>
      </div>
    </main>
  );
});