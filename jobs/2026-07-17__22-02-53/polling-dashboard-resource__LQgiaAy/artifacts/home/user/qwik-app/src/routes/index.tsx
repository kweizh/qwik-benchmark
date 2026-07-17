import {
  component$,
  useResource$,
  Resource,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { useLocation, type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  const loc = useLocation();
  const tickSignal = useSignal(0);
  const isPaused = useSignal(false);

  const metricsResource = useResource$(async ({ track, cleanup }) => {
    track(() => tickSignal.value);

    const abortController = new AbortController();
    cleanup(() => abortController.abort("cleanup"));

    const origin = loc.url.origin;
    const res = await fetch(`${origin}/api/metrics`, {
      signal: abortController.signal,
    });
    if (!res.ok) {
      throw new Error("Failed to fetch metrics");
    }
    return res.json() as Promise<{
      requestCount: number;
      cpu: number;
      memory: number;
      activeUsers: number;
      timestamp: number;
    }>;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup, track }) => {
    track(() => isPaused.value);

    if (!isPaused.value) {
      const interval = setInterval(() => {
        tickSignal.value++;
      }, 2000);

      cleanup(() => {
        clearInterval(interval);
      });
    }
  });

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Live Metrics Dashboard</h1>

      <div style={{ marginBottom: "20px" }}>
        <button
          data-testid="refresh-button"
          onClick$={() => {
            tickSignal.value++;
          }}
          style={{ marginRight: "10px", padding: "8px 16px" }}
        >
          Refresh Now
        </button>
        <button
          data-testid="toggle-button"
          onClick$={() => {
            isPaused.value = !isPaused.value;
          }}
          style={{ padding: "8px 16px" }}
        >
          {isPaused.value ? "Resume" : "Pause"} Polling
        </button>
      </div>

      <Resource
        value={metricsResource}
        onPending={() => (
          <div data-testid="loading-state">Loading metrics...</div>
        )}
        onRejected={(error) => (
          <div data-testid="error-state" style={{ color: "red" }}>
            Error: {error.message}
          </div>
        )}
        onResolved={(metrics) => (
          <div
            style={{
              display: "grid",
              gap: "10px",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            <div
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <h3>Request Count</h3>
              <p
                data-testid="metric-request-count"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                {metrics.requestCount}
              </p>
            </div>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <h3>CPU Usage</h3>
              <p
                data-testid="metric-cpu"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                {metrics.cpu}%
              </p>
            </div>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <h3>Memory Usage</h3>
              <p
                data-testid="metric-memory"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                {metrics.memory}%
              </p>
            </div>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <h3>Active Users</h3>
              <p
                data-testid="metric-active-users"
                style={{ fontSize: "24px", fontWeight: "bold" }}
              >
                {metrics.activeUsers}
              </p>
            </div>
            <div
              style={{
                border: "1px solid #ccc",
                padding: "15px",
                borderRadius: "4px",
              }}
            >
              <h3>Last Updated</h3>
              <p style={{ fontSize: "14px", color: "#666" }}>
                {new Date(metrics.timestamp).toLocaleTimeString()}
              </p>
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
      content: "Real-time server metrics dashboard",
    },
  ],
};
