// Counter REST endpoints.
//
//   GET  /api/counter     -> { count: number }   (current value)
//   POST /api/counter     -> { count: number }   (apply signed delta, broadcast)
//
// Both handlers delegate the shared state and broadcast logic to the
// server-only module in ~/lib/counter, so this file contains no mutable
// state of its own and is safe to import elsewhere.
import type { RequestHandler } from "@builder.io/qwik-city";
import { getCount, updateCounter } from "~/lib/counter";

/**
 * Return the current counter value as JSON.
 */
export const onGet: RequestHandler = async (requestEvent) => {
  const count = getCount();
  requestEvent.json(200, { count });
};

/**
 * Apply a signed delta to the shared counter and broadcast the resulting
 * value to every connected SSE subscriber.
 *
 * Request body is JSON of the shape `{ "delta": <integer> }`. The delta may
 * be negative to decrement. After the mutation the new value is mirrored
 * back in the response body so the originating client does not have to wait
 * for its own SSE frame to learn the result.
 */
export const onPost: RequestHandler = async (requestEvent) => {
  // parseBody returns a parsed JSON value for application/json requests,
  // falling back to URL-encoded / form data, or {} when there is no body.
  const body = (await requestEvent.parseBody()) as { delta?: unknown };
  const raw = body?.delta;

  // Reject anything that isn't a real number. We intentionally refuse to
  // coerce strings/booleans so the contract is tight.
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    requestEvent.json(400, { error: "delta must be a finite number" });
    return;
  }

  // Coerce to integer. The shared state is an integer counter, so a delta
  // like 1.7 would silently drift otherwise.
  const delta = Math.trunc(raw);

  const count = await updateCounter(delta);
  requestEvent.json(200, { count });
};
