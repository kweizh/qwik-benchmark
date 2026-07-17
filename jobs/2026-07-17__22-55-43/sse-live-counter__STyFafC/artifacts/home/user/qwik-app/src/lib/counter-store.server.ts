/**
 * Server-only in-memory shared counter + SSE subscriber registry.
 *
 * This module must ONLY ever be imported by server endpoints (`onGet` /
 * `onPost` handlers). The `.server.ts` suffix tells Qwik City to strip this
 * module from any client bundle and throw a build error if it is ever
 * imported from client-reachable code, guaranteeing there is exactly one
 * instance of this module (and therefore one shared counter + subscriber
 * set) per running Node process.
 */

// The single shared counter value for the whole server process.
let counter = 0;

// Each connected SSE client registers a writer here. Every mutation fans
// the new value out to every writer currently in this set.
const subscribers = new Set<WritableStreamDefaultWriter<Uint8Array>>();

const encoder = new TextEncoder();

function encodeFrame(value: number): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify({ count: value })}\n\n`);
}

/** Returns the current shared counter value. */
export function getCount(): number {
  return counter;
}

/**
 * Applies `delta` to the shared counter and broadcasts the new value to
 * every currently connected SSE subscriber. Returns the updated value.
 */
export function applyDelta(delta: number): number {
  counter += delta;
  broadcast(counter);
  return counter;
}

/** Sends `value` to every currently registered subscriber. */
function broadcast(value: number): void {
  const frame = encodeFrame(value);
  for (const writer of subscribers) {
    writer.write(frame).catch(() => {
      // Writer is dead; drop it so we stop trying to write to it.
      subscribers.delete(writer);
    });
  }
}

/** Registers a new subscriber and immediately returns the current value. */
export function subscribe(writer: WritableStreamDefaultWriter<Uint8Array>): number {
  subscribers.add(writer);
  return counter;
}

/** Removes a subscriber, e.g. once its connection has closed/aborted. */
export function unsubscribe(writer: WritableStreamDefaultWriter<Uint8Array>): void {
  subscribers.delete(writer);
}

/** Encodes a single SSE data frame for `value`. Exported for reuse. */
export function encodeCountFrame(value: number): Uint8Array {
  return encodeFrame(value);
}
