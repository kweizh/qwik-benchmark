import { component$ } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";
import { getActivityStats } from "../../../lib/db";

export const onGet: RequestHandler = async ({ url, json, next }) => {
  const format = url.searchParams.get("format");
  if (format === "json") {
    const stats = await getActivityStats();
    json(200, stats);
    return;
  }
  await next();
};

export const useActivityStats = routeLoader$(async () => {
  return await getActivityStats();
});

export default component$(() => {
  const statsSignal = useActivityStats();
  const { total_requests, average_duration_ms, logs } = statsSignal.value;

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Admin Activity Log</h1>
      <div style={{ marginBottom: "15px" }}>
        <strong>Total Requests:</strong> <span id="total-requests">{total_requests}</span>
      </div>
      <div style={{ marginBottom: "25px" }}>
        <strong>Average Duration:</strong> <span id="average-duration">{average_duration_ms}</span> ms
      </div>
      <h2>Recent Logs</h2>
      <ul id="logs-list" style={{ listStyleType: "none", padding: 0 }}>
        {logs.map((log) => (
          <li
            key={log.id}
            style={{
              padding: "10px",
              borderBottom: "1px solid #ccc",
              marginBottom: "5px",
            }}
          >
            <strong>ID:</strong> {log.id} | <strong>Timestamp:</strong> {log.timestamp} |{" "}
            <strong>Method:</strong> {log.method} | <strong>Path:</strong> {log.path} |{" "}
            <strong>IP:</strong> {log.ip} | <strong>Duration:</strong> {log.duration_ms}ms
          </li>
        ))}
      </ul>
    </div>
  );
});
