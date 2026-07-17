# Rate Limiting Middleware with Mock Redis in Qwik City

## Background
Rate limiting is a critical component of web application security and resource management. In this task, you will implement a custom rate-limiting middleware for a Qwik City application using an in-memory mock Redis-like store to track request counts.

## Requirements
- Implement a rate-limiting middleware that restricts requests to the `/api/data` endpoint.
- The rate limit must be **5 requests per 10 seconds per IP address**.
- The rate limiter must use a fixed-window algorithm of 10 seconds. The window ID is calculated as `Math.floor(Date.now() / 10000)`.
- The IP address of the client must be determined by checking:
  1. The first IP address in the `X-Forwarded-For` request header (if present).
  2. The `clientConn.ip` property of the Qwik City request event (if present).
  3. Defaulting to `127.0.0.1` if neither is available.
- For every request to `/api/data`, the server must return the following headers:
  - `X-RateLimit-Limit`: `5`
  - `X-RateLimit-Remaining`: The number of remaining requests allowed in the current window (from `4` down to `0` for successful requests, and `0` for rate-limited requests).
  - `X-RateLimit-Reset`: The Unix timestamp (in seconds) when the current window resets, calculated as `(Math.floor(Date.now() / 10000) + 1) * 10`.
- When a client exceeds the rate limit (i.e., makes a 6th request within the same 10-second window), the server must respond with HTTP status code `429 Too Many Requests` and a JSON body `{"error": "Too Many Requests"}`. The rate-limiting headers must still be present on 429 responses.
- Implement an in-memory mock Redis-like key-value store to keep track of rate limits. The store must clean up expired keys (older than the current window) to prevent memory leaks.
- Implement a debug endpoint GET `/api/debug-store` that returns the current state of the in-memory store.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- API Endpoints:
  - GET `/api/data`:
    - Successful Response (Status 200):
      ```json
      {
        "data": "Success"
      }
      ```
    - Rate Limited Response (Status 429):
      ```json
      {
        "error": "Too Many Requests"
      }
      ```
  - GET `/api/debug-store`:
    - Response (Status 200):
      ```json
      {
        "keys": {
          "<key_name>": <count_integer>
        }
      }
      ```
      Where `<key_name>` follows the format `ratelimit:<ip>:<window_id>` (e.g., `ratelimit:127.0.0.1:178563420`) and the value is the request count.

