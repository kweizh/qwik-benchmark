// src/server/counter-state.ts

interface SharedCounterState {
  count: number;
  subscribers: Set<WritableStreamDefaultWriter<Uint8Array>>;
}

const GLOBAL_KEY = Symbol.for('qwik.shared-counter-state');

if (!(globalThis as any)[GLOBAL_KEY]) {
  (globalThis as any)[GLOBAL_KEY] = {
    count: 0,
    subscribers: new Set<WritableStreamDefaultWriter<Uint8Array>>(),
  };
}

const state: SharedCounterState = (globalThis as any)[GLOBAL_KEY];
const encoder = new TextEncoder();

export function getCount() {
  return state.count;
}

export function addSubscriber(writer: WritableStreamDefaultWriter<Uint8Array>) {
  state.subscribers.add(writer);
}

export function removeSubscriber(writer: WritableStreamDefaultWriter<Uint8Array>) {
  state.subscribers.delete(writer);
}

export function broadcast(newCount: number) {
  const message = `data: ${JSON.stringify({ count: newCount })}\n\n`;
  const data = encoder.encode(message);
  for (const writer of state.subscribers) {
    try {
      writer.write(data).catch((err) => {
        console.error('Error writing to subscriber, removing:', err);
        state.subscribers.delete(writer);
      });
    } catch (err) {
      console.error('Error writing to subscriber, removing:', err);
      state.subscribers.delete(writer);
    }
  }
}

export function updateCount(delta: number) {
  state.count += delta;
  broadcast(state.count);
  return state.count;
}
