// In-memory pub/sub hub for the collaborative notepad.
// This module is server-only: it must never be bundled into client code.
// All state lives on `globalThis` so HMR module reloads in dev preserve it
// across requests that share the same Node.js process.

export type ClientId = string;

export interface Subscriber {
  /** Encode and write a chunk of text to the underlying response stream. */
  write: (chunk: string) => Promise<void>;
  /** Close the underlying response stream. Safe to call multiple times. */
  close: () => Promise<void>;
}

interface NotepadState {
  text: string;
  subscribers: Set<Subscriber>;
}

// Store the singleton state on `globalThis` so Vite's HMR re-evaluations
// of this module don't reset the document text or drop active subscribers.
const g = globalThis as unknown as { __qwikNotepadHub?: NotepadState };

function getState(): NotepadState {
  if (!g.__qwikNotepadHub) {
    g.__qwikNotepadHub = {
      text: "",
      subscribers: new Set<Subscriber>(),
    };
  }
  return g.__qwikNotepadHub;
}

export function getText(): string {
  return getState().text;
}

export async function broadcastUpdate(
  text: string,
  clientId: ClientId,
): Promise<void> {
  const state = getState();
  state.text = text;

  // SSE wire format: "event: update\ndata: {json}\n\n"
  // JSON.stringify always produces a single-line output, satisfying the
  // "single-line JSON object" requirement on the `data:` line.
  const message =
    "event: update\n" +
    "data: " +
    JSON.stringify({ text, clientId }) +
    "\n\n";

  // Snapshot to a plain array so we can safely iterate while subscribers
  // may concurrently unsubscribe during writes.
  const snapshot = Array.from(state.subscribers);
  for (const sub of snapshot) {
    try {
      await sub.write(message);
    } catch {
      // Swallow individual write failures; the abort handler is responsible
      // for cleaning up dead subscribers.
    }
  }
}

export function subscribe(subscriber: Subscriber): () => void {
  const state = getState();
  state.subscribers.add(subscriber);
  return () => {
    state.subscribers.delete(subscriber);
  };
}
