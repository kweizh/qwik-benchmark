import type { RequestHandler } from "@builder.io/qwik-city";
import { getQuery, allQuery } from "../../../db";

export const onGet: RequestHandler = async (event) => {
  const url = new URL(event.request.url);
  const format = url.searchParams.get("format");

  // Fetch stats
  const statsRow = await getQuery<{
    total_requests: number;
    average_duration: number | null;
  }>(
    "SELECT COUNT(*) as total_requests, AVG(duration_ms) as average_duration FROM ActivityLog",
  );
  const total_requests = statsRow?.total_requests || 0;
  const raw_avg = statsRow?.average_duration;
  const average_duration_ms =
    raw_avg !== null && raw_avg !== undefined
      ? Math.round(raw_avg * 100) / 100
      : 0;

  // Fetch all logs ordered by timestamp DESC
  interface LogRow {
    id: number;
    path: string;
    method: string;
    ip: string;
    timestamp: string;
    duration_ms: number;
  }
  const logs = await allQuery<LogRow>(
    "SELECT id, path, method, ip, timestamp, duration_ms FROM ActivityLog ORDER BY timestamp DESC",
  );

  if (format === "json") {
    event.json(200, {
      total_requests,
      average_duration_ms,
      logs,
    });
    return;
  }

  // HTML Format (Default)
  const logsListHtml = logs
    .map(
      (log) => `
    <div class="log-item" style="border-bottom: 1px solid #eee; padding: 8px 0;">
      <strong>${log.method}</strong> <code>${log.path}</code> - 
      <span>${log.duration_ms}ms</span> at <span>${log.timestamp}</span> (IP: ${log.ip})
    </div>
  `,
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Admin Activity</title>
  <style>
    body { font-family: sans-serif; margin: 40px; color: #333; }
    .metric { margin-bottom: 20px; font-size: 1.2rem; }
    .metric span { font-weight: bold; }
    #logs-list { margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Admin Activity</h1>
  <div class="metric">
    Total Requests: <span id="total-requests">${total_requests}</span>
  </div>
  <div class="metric">
    Average Duration: <span id="average-duration">${average_duration_ms}</span> ms
  </div>
  <h2>Recent Logs</h2>
  <div id="logs-list">${logsListHtml || "<p>No logs found</p>"}</div>
</body>
</html>`;

  event.html(200, htmlContent);
};
