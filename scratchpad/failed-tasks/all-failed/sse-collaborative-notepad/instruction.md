# Real-Time Collaborative Notepad with Qwik City + Server-Sent Events

## Background
You are building a shared collaborative notepad using the **Qwik** framework and **Qwik City** meta-framework. Multiple browser tabs can edit the same document, and edits made in one tab appear in every other connected tab in real time. Real-time delivery is implemented with **Server-Sent Events (SSE)** served directly from a Qwik City endpoint, and edits are broadcast to all connected clients through an **in-memory publish/subscribe** hub that also remembers the latest document text.

Everything runs locally. There are **no external services, databases, or third-party APIs** — the pub/sub hub, the SSE stream, and the update endpoint all live inside the Qwik City app.

A base Qwik City project has already been scaffolded and its dependencies installed at the project path below. Your job is to implement the notepad feature.

## Requirements
- Implement a single Qwik City **endpoint** file that serves two HTTP methods on the same route `/api/notepad`:
  - `GET`: opens a long-lived **SSE** stream (`Content-Type: text/event-stream`). Immediately upon connection it sends the current document text as a `snapshot` event, then forwards every subsequent edit as an `update` event.
  - `POST`: accepts a JSON edit, updates the server-held document text, broadcasts the edit to all currently connected SSE clients, and returns a small JSON acknowledgement.
- Implement an **in-memory pub/sub hub** that keeps the latest document text and a set of active subscribers. Broadcasting an edit must reach every connected SSE client. Connections must be cleaned up (unsubscribed) when a client disconnects.
- Implement the notepad UI at the index route `/` as a Qwik `component$`:
  - Render a `<textarea>` bound to reactive state (`useSignal` or `useStore`).
  - Open the SSE connection from inside `useVisibleTask$` using the browser `EventSource` API, reconcile incoming `snapshot` and `update` events into the reactive state, and close the connection in the task `cleanup`.
  - When the user types, send the new text to the `POST` endpoint. An edit originating from a given client must not clobber that same client's in-progress text when it is echoed back (ignore your own broadcasts by comparing a client id).

## Implementation Hints
- Project path: /home/user/qwik-app
- Start command: `npm run dev -- --port 3000 --host 0.0.0.0`
- Port: 3000
- Use a Qwik City `index.ts` endpoint with `onGet` / `onPost` request handlers. For SSE, write to the response using `requestEvent.getWritableStream()` and a `TextEncoder`; set the response headers to `text/event-stream`. Keep server-only pub/sub logic out of client bundles (keep it in a module imported only by the endpoint).
- Remember Qwik's serialization and hook rules: all `use*` hooks must be called synchronously at the top level of the component, and browser-only APIs like `EventSource` belong inside `useVisibleTask$`.
- **SSE wire format (must match exactly so the stream is machine-readable):**
  - The initial event MUST be:
    ```
    event: snapshot
    data: {"text":"<current document text>"}

    ```
  - Each broadcast edit MUST be sent as:
    ```
    event: update
    data: {"text":"<new text>","clientId":"<originating client id>"}

    ```
  - Each event ends with a blank line (`\n\n`). The `data:` line MUST be a single-line JSON object.
- **POST `/api/notepad`** request body is JSON `{"text": string, "clientId": string}`. It MUST update the stored document text, broadcast an `update` event carrying that same `text` and `clientId` to all connected SSE clients, and respond with HTTP 200 and body `{"ok": true}`.
- **GET `/api/notepad`** MUST respond with header `Content-Type: text/event-stream` and MUST emit exactly one `snapshot` event (reflecting the latest stored text) as the first event on every new connection.
- The index route `/` MUST render a `<textarea>` element and MUST establish the `EventSource` connection to `/api/notepad` from within `useVisibleTask$`.

