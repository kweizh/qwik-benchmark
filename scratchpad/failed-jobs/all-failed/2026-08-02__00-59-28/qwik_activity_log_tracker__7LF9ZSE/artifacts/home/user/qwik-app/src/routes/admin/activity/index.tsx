import type { RequestHandler } from "@builder.io/qwik-city";
import { getAllLogs, getTotalRequests, getAverageDuration } from "~/db";

export const onGet: RequestHandler = async (ev) => {
  const format = ev.query.get("format");

  if (format === "json") {
    const [total_requests, average_duration_ms, logs] = await Promise.all([
      getTotalRequests(),
      getAverageDuration(),
      getAllLogs(),
    ]);

    ev.json(200, {
      total_requests,
      average_duration_ms,
      logs,
    });
    return;
  }

  // HTML format
  const [totalRequests, averageDuration, logs] = await Promise.all([
    getTotalRequests(),
    getAverageDuration(),
    getAllLogs(),
  ]);

  const logsHtml = logs
    .map(
      (log) =>
        `<tr>
          <td>${log.id}</td>
          <td>${log.method}</td>
          <td>${log.path}</td>
          <td>${log.ip}</td>
          <td>${log.timestamp}</td>
          <td>${log.duration_ms}ms</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Activity</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 20px; background: #f5f5f5; }
    .metrics { display: flex; gap: 20px; margin-bottom: 20px; }
    .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1; }
    .metric-card h3 { margin: 0 0 8px 0; color: #666; font-size: 14px; text-transform: uppercase; }
    .metric-card .value { font-size: 28px; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; font-size: 13px; text-transform: uppercase; }
    tr:hover { background: #f8f9fa; }
  </style>
</head>
<body>
  <h1>Admin Activity</h1>
  <div class="metrics">
    <div class="metric-card">
      <h3>Total Requests</h3>
      <div class="value" id="total-requests">${totalRequests}</div>
    </div>
    <div class="metric-card">
      <h3>Average Duration</h3>
      <div class="value" id="average-duration">${averageDuration}</div>
    </div>
  </div>
  <h2>Recent Logs</h2>
  <div id="logs-list">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Method</th>
          <th>Path</th>
          <th>IP</th>
          <th>Timestamp</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        ${logsHtml || '<tr><td colspan="6" style="text-align:center;color:#999;">No logs yet</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  ev.html(200, html);
};
