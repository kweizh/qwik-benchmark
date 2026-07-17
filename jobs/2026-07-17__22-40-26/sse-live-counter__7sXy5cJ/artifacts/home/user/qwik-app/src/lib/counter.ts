// Server-only module: holds the shared counter value and the registry of
// subscribers (SSE response writers) used by the streaming endpoint. This file
// is only imported by server endpoints, so its code is never included in any
// client bundle that the Qwik optimizer produces.
//
// In Qwik City's dev server (vite --mode ssr), the Node.js process is
// persistent across requests, so this module's module-level state is naturally
// shared by every incoming request that touches it.

/**
 * The shape of the data we push over SSE. JSON-serialized into the
 * `data:` payload of each Server-Sent Event frame.
 */
export interface CounterPayload {
  count: number;
}

/**
 * A minimal interface that abstracts the writer we need to push events to.
 * `QwikCity`'s `RequestEvent.getWritableStream()` returns a
 * `WritableStreamDefaultWriter<Uint8Array>`, but we keep the surface tiny so
 * the module stays trivial to test and has no Qwik-city coupling outside the
 * endpoints that import it.
 */
export interface CounterWriter {
  write(chunk: Uint8Array): Promise<void>;
  close?(): Promise<void>;
}

/**
 * The single, process-wide counter. It is intentionally a module-local `let`
 * (no `globalThis` indirection) because Qwik City's dev SSR server keeps the
 * Node.js process alive across requests, so all requests observe the same
 * module instance and therefore the same value.
 */
let count = 0;

/**
 * Registry of currently connected SSE subscribers. We key by the writer
 * itself (identity), since the writer uniquely identifies a connection.
 */
const subscribers = new Set<CounterWriter>();

/**
 * Encode one SSE frame for the given payload. The format is the spec'd
 * text/event-stream data frame:
 *
 *   data: <single-line JSON>\n
 *   \n
 *
 * The payload is forced onto a single line by JSON.stringify (which never
 * emits raw newlines), then a blank line terminates the frame as required.
 */
export function encodeSseFrame(payload: CounterPayload): Uint8Array {
  const json = JSON.stringify(payload);
  const frame = `data: ${json}\n\n`;
  return new TextEncoder().encode(frame);
}

/**
 * Current shared counter value. Pure read.
 */
export function getCount(): number {
  return count;
}

/**
 * Register an SSE writer as a subscriber. Returns an `unsubscribe` function
 * that, when called, idempotently removes the writer from the registry.
 * Callers should invoke `unsubscribe` when the underlying connection ends
 * (e.g. on `requestEvent.signal` abort).
 */
export function addSubscriber(writer: CounterWriter): () => void {
  subscribers.add(writer);
  return () => {
    subscribers.delete(writer);
  };
}

/**
 * Push a payload to every registered subscriber. Errors from individual
 * writers (closed/aborted connections, network errors, etc.) are swallowed
 * and the offending writer is dropped from the registry so a single broken
 * client cannot stall the broadcast loop.
 */
export async function broadcast(payload: CounterPayload): Promise<void> {
  const frame = encodeSseFrame(payload);
  const dead: CounterWriter[] = [];
  for (const writer of subscribers) {
    try {
      await writer.write(frame);
    } catch {
      dead.push(writer);
    }
  }
  for (const writer of dead) {
    subscribers.delete(writer);
  }
}

/**
 * Apply a signed delta to the shared counter and fan the new value out to
 * every connected subscriber. The update is atomic from the point of view
 * of the broadcaster (no awaits between read and write), so concurrent
 * mutations can't interleave a stale value into the broadcast.
 *
 * Returns the new counter value, which the POST endpoint mirrors back to the
 * caller in its JSON response.
 */
export async function updateCounter(delta: number): Promise<number> {
  count = count + delta;
  await broadcast({ count });
  return count;
}
