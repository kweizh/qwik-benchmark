import type { RequestHandler } from '@builder.io/qwik-city';
import { getActivityLogs, getActivityMetrics } from '../../../lib/db';

export const onGet: RequestHandler = async ({ query, json, html }) => {
  const format = query.get('format');
  const metrics = await getActivityMetrics();
  const logs = await getActivityLogs();

  if (format === 'json') {
    json(200, {
      total_requests: metrics.total_requests,
      average_duration_ms: metrics.average_duration_ms,
      logs: logs,
    });
    return;
  }

  // HTML format
  const logsListHtml = logs
    .map(
      (log) => `
    <div class="log-item" style="border-bottom: 1px solid #eee; padding: 8px 0;">
      <strong>[${log.timestamp}]</strong> ${log.method} ${log.path} - 
      <span>IP: ${log.ip}</span> - 
      <span>Duration: ${log.duration_ms}ms</span>
    </div>
  `
    )
    .join('');

  html(
    200,
    `<!DOCTYPE html>
<html>
  <head>
    <title>Admin Activity Log</title>
    <style>
      body { font-family: sans-serif; margin: 40px; }
      .metric { font-size: 1.5rem; margin-bottom: 10px; }
      #logs-list { margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Admin Activity Log</h1>
    <div class="metric">
      Total Requests: <span id="total-requests">${metrics.total_requests}</span>
    </div>
    <div class="metric">
      Average Duration (ms): <span id="average-duration">${metrics.average_duration_ms}</span>
    </div>
    <h2>Recent Logs</h2>
    <div id="logs-list">
      ${logsListHtml || '<p>No logs found.</p>'}
    </div>
  </body>
</html>`
  );
};
