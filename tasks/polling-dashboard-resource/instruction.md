# Live Metrics Dashboard with Qwik City

## Background
You are building a real-time server metrics dashboard using the [Qwik](https://qwik.dev/) framework and Qwik City. The app must expose a **local** JSON endpoint that returns server-generated statistics, and a component that displays those statistics and automatically polls the endpoint for fresh data on an interval. Everything runs locally; the app must never call any external service or network host.

A Qwik City project has already been scaffolded at the project path. Your job is to implement the metrics endpoint and the dashboard component.

## Requirements
1. **Local metrics endpoint** at route `/api/metrics` implemented as a Qwik City endpoint using an exported `onGet` `RequestHandler`. It returns a JSON body (HTTP 200) describing current server stats.
   - The server keeps an **in-memory counter** that increases by exactly 1 on every GET request to this endpoint. The first ever request returns a counter value of `1`.
   - All metric values are derived **deterministically** from this counter so that the endpoint is reproducible given the same counter value (do not use `Math.random`).
2. **Dashboard component** rendered at the site root route `/` that:
   - Uses `useResource$()` together with the `<Resource>` component to fetch `/api/metrics` and render distinct **pending**, **resolved**, and **rejected** UI (all three `onPending`, `onResolved`, and `onRejected` handlers must be provided).
   - Uses a `useVisibleTask$()` timer that automatically re-triggers the resource to poll for fresh data on a fixed interval, and cleans up the timer with the task `cleanup` callback.
   - Provides a **manual refresh** control that immediately re-fetches fresh data.
   - Provides a **pause/resume** control that stops and restarts the automatic polling. When paused, the automatic timer must not fetch new data; when resumed, polling continues.

## Implementation Hints
- Keep all server-only state (the counter) in module scope inside the endpoint file so it persists across requests within a single server process.
- To re-trigger a `useResource$` from a timer or a button, `track()` a reactive signal (for example a "tick" counter) inside the resource and change that signal to force a re-fetch.
- Register the interval inside `useVisibleTask$()` and clear it inside the `cleanup()` callback so no timers leak; gate the interval on the pause/resume state.
- The dashboard renders during SSR, so the resolved metrics appear in the initial server-rendered HTML.
- Project path: /home/user/qwik-app
- Start command: `npm run dev -- --port 3000 --host 127.0.0.1`
- Port: 3000
- The dashboard page is served at `GET /` and the endpoint at `GET /api/metrics`.

### Endpoint response shape
`GET /api/metrics` must return HTTP 200 with `Content-Type: application/json` and exactly these keys:
```json
{
  "requestCount": number,
  "cpu": number,
  "memory": number,
  "activeUsers": number,
  "timestamp": number
}
```
Where, using `n` = the current value of the in-memory counter after incrementing it for this request:
- `requestCount` = `n`
- `cpu` = `(n * 7) % 100`
- `memory` = `(n * 13) % 100`
- `activeUsers` = `(n * 3) % 250`
- `timestamp` = the current time in milliseconds (`Date.now()`)

### Dashboard DOM requirements
The automated checks locate elements by `data-testid`. The resolved dashboard must render these attributes:
- The container/heading area includes the visible text `Live Metrics Dashboard`.
- An element with `data-testid="metric-request-count"` whose text content contains the current `requestCount` value.
- An element with `data-testid="metric-cpu"` whose text content contains the current `cpu` value.
- An element with `data-testid="metric-memory"` whose text content contains the current `memory` value.
- An element with `data-testid="metric-active-users"` whose text content contains the current `activeUsers` value.
- A button with `data-testid="refresh-button"` that manually re-fetches data.
- A button with `data-testid="toggle-button"` that pauses/resumes automatic polling.
- The automatic polling interval must be **2000 milliseconds** (poll every 2 seconds) so timing-based checks behave predictably.

