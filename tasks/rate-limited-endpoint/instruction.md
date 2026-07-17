# Rate-Limited JSON API with Qwik City

## Background
You are building an abuse-protection layer for a public JSON API using **Qwik City** (the meta-framework built on Qwik). A pre-scaffolded, empty Qwik City project already exists at `/home/user/qwik-app` (dependencies installed, dev server working). Your job is to add a JSON endpoint that is protected by an in-memory, per-client rate limiter implemented as shared route middleware, plus a demo page that reports how much quota a client has left.

## Requirements
- Add a JSON API endpoint at route `/api/data` that handles both `GET` and `POST` requests and returns application/json.
- Protect every request under `/api/` with a **shared `onRequest` middleware defined in a layout** (not inline in the endpoint file). The middleware must enforce the limiter for all routes below it.
- The limiter must be an **in-memory** limiter (token-bucket or sliding-window style) keyed by the **client IP**, allowing at most **5 requests per rolling 5-second window per IP**. No external service, database, or network access may be used; all state lives in process memory.
- On every `/api/data` response (both allowed and blocked), set these response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
- When a client exceeds the limit, respond with HTTP **429** and a JSON body, and include a `Retry-After` header. The middleware must stop the chain so the endpoint handler does not run for blocked requests.
- Add a demo page at route `/status` (a rendered HTML component route, NOT under `/api/`) that displays the current remaining quota and the limit for the requesting client, and that does **not** consume any quota when viewed.

## Implementation Hints
- Use a Qwik City `layout.tsx` under `src/routes/api/` and export an `onRequest` `RequestHandler` from it; the endpoint at `src/routes/api/data/index.ts` should export `onGet` and `onPost` handlers.
- Keep the limiter state in a single shared server-side module (a plain `Map` in module scope) that is imported by both the middleware and the `/status` route so they observe the same counters. Use `sharedMap` to pass the computed remaining count from the middleware to the endpoint handlers if convenient.
- Resolve the client IP from the `X-Forwarded-For` request header when present (use the first address in the comma-separated list); otherwise fall back to the connection's client IP. Rate limiting must be strictly per-IP: one IP being blocked must not affect a different IP.
- Consuming/counting a request must happen exactly once per HTTP request in the middleware. The `/status` page must only read (peek) the limiter state, never increment it.
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev -- --host 127.0.0.1 --port 8787`
- Port: `8787`
- API + route contract:
  - `GET /api/data` and `POST /api/data` (when allowed): return status `200` with a JSON object that includes at least the keys `method` (the string `"GET"` or `"POST"`) and `remaining` (a number equal to the requests still allowed for that IP in the current window after counting the current request). Response headers must include `X-RateLimit-Limit` (value `5`), `X-RateLimit-Remaining` (the same number as `remaining`, as a string), and `X-RateLimit-Reset` (a non-negative integer number of seconds until the window resets).
  - When the per-IP limit is exceeded: return status `429` with a JSON body containing an `error` key, with `X-RateLimit-Remaining` equal to `0`, a `Retry-After` header set to a positive integer number of seconds, and the same `X-RateLimit-*` headers present.
  - `GET /status`: return an HTML page whose text contains `Limit: 5` and `Remaining: <n>` where `<n>` is the current remaining quota for the requesting client IP. Viewing this page must not change any client's remaining quota.

