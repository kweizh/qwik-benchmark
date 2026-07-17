import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead, RequestHandler } from "@builder.io/qwik-city";
import {
  getActivityStats,
  getAllActivityLogs,
  type ActivityLogRow,
} from "~/lib/db";

interface ActivityData {
  total: number;
  averageDuration: number;
  logs: ActivityLogRow[];
}

async function loadActivityData(): Promise<ActivityData> {
  const [stats, logs] = await Promise.all([
    getActivityStats(),
    getAllActivityLogs(),
  ]);
  return {
    total: stats.total,
    averageDuration: stats.averageDuration,
    logs,
  };
}

/**
 * Handles the `?format=json` variant of this page. When present, the JSON
 * response is sent directly and the rest of the middleware chain (loaders,
 * rendering) is skipped. Otherwise, execution falls through to the
 * `routeLoader$` + component below, which render the HTML version.
 */
export const onGet: RequestHandler = async (requestEvent) => {
  if (requestEvent.query.get("format") === "json") {
    const data = await loadActivityData();
    requestEvent.json(200, {
      total_requests: data.total,
      average_duration_ms: data.averageDuration,
      logs: data.logs,
    });
  }
};

export const useActivityData = routeLoader$<ActivityData>(async () => {
  return loadActivityData();
});

export default component$(() => {
  const data = useActivityData();

  return (
    <div>
      <h1>Admin Activity</h1>
      <p>
        Total Requests: <span id="total-requests">{data.value.total}</span>
      </p>
      <p>
        Average Duration (ms):{" "}
        <span id="average-duration">{data.value.averageDuration}</span>
      </p>
      <div id="logs-list">
        {data.value.logs.map((log) => (
          <div key={log.id} class="log-entry" data-log-id={log.id}>
            <span class="log-id">{log.id}</span>
            <span class="log-path">{log.path}</span>
            <span class="log-method">{log.method}</span>
            <span class="log-ip">{log.ip}</span>
            <span class="log-timestamp">{log.timestamp}</span>
            <span class="log-duration">{log.duration_ms}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Admin Activity",
};
