# Qwik City Live Shared Counter over Server-Sent Events

## Background
You are building a real-time "live shared counter" widget for a Qwik City application. The application keeps a single shared integer counter in server memory. Every connected browser subscribes to a Server-Sent Events (SSE) stream and sees the counter change in real time. Any client can increment or decrement the shared counter, and the new value must be pushed to **every** currently connected subscriber (not just the client that made the change).

Everything must run locally with no external services: the pub/sub broker is an in-memory data structure inside the running server process, and the SSE stream and mutation endpoint are plain Qwik City endpoints.

## Requirements
- Maintain one shared, in-memory integer counter for the whole server process (initial value `0`).
- Provide an SSE endpoint that streams the current counter value to each connected client. On connection it must immediately emit the current value, and thereafter emit the new value every time the counter changes.
- Provide a mutation endpoint that adjusts the shared counter by a signed delta and broadcasts the resulting value to **all** currently connected SSE subscribers.
- Provide a plain endpoint that returns the current counter value as JSON.
- Render a home-page component that subscribes to the SSE stream from the browser, stores the latest value in reactive state, displays it, and unsubscribes when the component is destroyed. The subscription must be established with a browser `EventSource` created inside a client-only visible task, and the stream connection must be closed during cleanup.
- Multiple simultaneous SSE connections must all receive every broadcast update.

## Implementation Hints
- Use a Qwik City endpoint (`onGet`) with `requestEvent.getWritableStream()` to produce the `text/event-stream` response, and keep a shared registry (e.g. a `Set` of stream writers) in a server-only module so a single counter/subscriber list is shared across requests in the process.
- Use another endpoint (`onPost`) to mutate the shared counter and fan the new value out to every registered subscriber. Parse the JSON body with `requestEvent.parseBody()`.
- Keep the mutable state and broadcast logic in a module that is only ever imported by server endpoints so it is never dragged into the client bundle.
- Use `useVisibleTask$` for the browser-only `EventSource` subscription, store the value in a `useSignal`, and close the `EventSource` inside the task `cleanup` callback.
- Remove a subscriber's writer from the registry when its connection aborts (`requestEvent.signal`).

### Hard requirements (must match exactly)
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0` (the Qwik City SSR dev server; a single persistent Node process so the in-memory counter and subscriber registry are shared across all requests). Port: `3000`.
- The home page (`GET /`) must render an element with `id="counter-value"` whose text content is the current counter value (a number). This element must update live in the browser as the counter changes.
- SSE stream endpoint: `GET /api/counter/stream`
  - Response `Content-Type` header must start with `text/event-stream`.
  - Each message must be a standard SSE data frame terminated by a blank line, where the data payload is JSON of the form `{"count": <integer>}` (i.e. a line `data: {"count": <integer>}` followed by an empty line).
  - Immediately after connecting, the endpoint must emit one frame carrying the current counter value.
- Mutation endpoint: `POST /api/counter`
  - Request body: JSON `{ "delta": <integer> }` (delta may be negative).
  - It must apply the delta to the shared counter, broadcast the new value to all connected SSE subscribers, and respond with status `200` and JSON body `{ "count": <integer> }` containing the updated value.
- Current-value endpoint: `GET /api/counter` must respond with status `200` and JSON body `{ "count": <integer> }` containing the current value.
- The counter is shared process-wide: a mutation from one client must be observable by every other client (via SSE) and via `GET /api/counter`.

