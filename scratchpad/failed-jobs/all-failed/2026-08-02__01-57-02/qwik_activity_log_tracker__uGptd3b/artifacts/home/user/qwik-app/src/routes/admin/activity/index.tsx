import { component$ } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";
import { getStats, getLogs } from "../../../db";

export const onGet: RequestHandler = async ({ url, json }) => {
  if (url.searchParams.get("format") === "json") {
    const stats = await getStats();
    const logs = await getLogs();
    json(200, {
      total_requests: stats.total_requests,
      average_duration_ms: stats.average_duration_ms,
      logs,
    });
  }
};

export const useActivityData = routeLoader$(async () => {
  const stats = await getStats();
  const logs = await getLogs();
  return {
    total_requests: stats.total_requests,
    average_duration_ms: stats.average_duration_ms,
    logs,
  };
});

export default component$(() => {
  const data = useActivityData();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Admin Activity</h1>
      <div>
        <strong>Total Requests:</strong>{" "}
        <span id="total-requests">{data.value.total_requests}</span>
      </div>
      <div>
        <strong>Average Duration (ms):</strong>{" "}
        <span id="average-duration">{data.value.average_duration_ms}</span>
      </div>
      <h2>Recent Logs</h2>
      <div id="logs-list">
        {data.value.logs.map((log) => (
          <div
            key={log.id}
            style={{
              padding: "8px",
              borderBottom: "1px solid #ccc",
              margin: "4px 0",
            }}
          >
            <strong>ID:</strong> {log.id} | <strong>Path:</strong> {log.path} |{" "}
            <strong>Method:</strong> {log.method} | <strong>IP:</strong> {log.ip} |{" "}
            <strong>Timestamp:</strong> {log.timestamp} |{" "}
            <strong>Duration:</strong> {log.duration_ms}ms
          </div>
        ))}
      </div>
    </div>
  );
});
