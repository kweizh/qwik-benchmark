/**
 * Server-only module that holds the shared, in-memory counter state and the
 * registry of currently connected SSE subscribers.
 *
 * This module MUST only ever be imported by server-side endpoints so that the
 * mutable state and the subscriber registry are never dragged into the client
 * bundle. Because the Qwik City SSR dev server runs as a single persistent
 * Node process, the module-level state below is shared across every request.
 */

export type Subscriber = {
  /** Send a single SSE data frame carrying the given counter value. */
  send: (count: number) => void;
  /** Tear down the underlying writer / stream resources. */
  close: () => void;
};

// The single shared counter for the whole server process (initial value 0).
let count = 0;

// The set of currently connected SSE subscribers.
const subscribers = new Set<Subscriber>();

const encoder = new TextEncoder();

/** Build a single SSE data frame carrying the given counter value. */
export function frame(count: number): Uint8Array {
  // Standard SSE data frame: `data: {"count": <integer>}\n\n`
  return encoder.encode(`data: {"count": ${count}}\n\n`);
}

/** Returns the current shared counter value. */
export function getCount(): number {
  return count;
}

/**
 * Registers a new SSE subscriber. The subscriber's writer is added to the
 * registry so it receives every future broadcast. Returns the subscriber
 * handle which the endpoint can later use to remove itself on disconnect.
 */
export function addSubscriber(subscriber: Subscriber): Subscriber {
  subscribers.add(subscriber);
  return subscriber;
}

/** Removes a subscriber from the registry (e.g. when its connection aborts). */
export function removeSubscriber(subscriber: Subscriber): void {
  subscribers.delete(subscriber);
}

/**
 * Applies a signed delta to the shared counter, then fans the resulting value
 * out to EVERY currently connected subscriber. Returns the new counter value.
 */
export function applyDelta(delta: number): number {
  count += delta;
  broadcast(count);
  return count;
}

/** Pushes the given counter value to all registered subscribers. */
export function broadcast(value: number): void {
  for (const subscriber of subscribers) {
    try {
      subscriber.send(value);
    } catch {
      // If writing fails, the connection is most likely dead; drop it.
      subscribers.delete(subscriber);
    }
  }
}