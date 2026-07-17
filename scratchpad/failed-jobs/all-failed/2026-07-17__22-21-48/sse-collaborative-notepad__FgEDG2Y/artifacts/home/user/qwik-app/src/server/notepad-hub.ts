/**
 * Server-only in-memory publish/subscribe hub for the collaborative notepad.
 *
 * This module keeps the latest document text and a set of active subscribers
 * (one per connected SSE client). It is only ever imported by the
 * `/api/notepad` endpoint, which runs exclusively on the server, so none of
 * this logic ever ends up in a client bundle.
 *
 * Everything lives in process memory: there are no external services,
 * databases, or third-party APIs involved.
 */

/** An edit broadcast to every connected SSE client. */
export interface NotepadUpdateEvent {
  readonly type: "update";
  readonly text: string;
  readonly clientId: string;
}

/** The only kind of event currently broadcast by the hub. */
export type NotepadEvent = NotepadUpdateEvent;

/** A callback invoked whenever a new edit is broadcast. */
export type NotepadSubscriber = (event: NotepadEvent) => void;

/** The latest known document text. */
let documentText = "";

/** The set of currently connected subscribers. */
const subscribers = new Set<NotepadSubscriber>();

/** Returns the latest document text held by the server. */
export function getDocumentText(): string {
  return documentText;
}

/** Replaces the document text held by the server. */
export function setDocumentText(text: string): void {
  documentText = text;
}

/**
 * Registers a subscriber so it receives every subsequent broadcast.
 * Returns an `unsubscribe` function that removes the subscriber; it MUST be
 * called when a client disconnects so the connection is cleaned up.
 */
export function subscribe(subscriber: NotepadSubscriber): () => void {
  subscribers.add(subscriber);
  return function unsubscribe(): void {
    subscribers.delete(subscriber);
  };
}

/**
 * Broadcasts an edit to every currently connected subscriber. A subscriber
 * that throws while handling the event is skipped so a single broken client
 * can't prevent the others from receiving the update.
 */
export function broadcast(event: NotepadEvent): void {
  // Copy the set so a subscriber unsubscribing during iteration doesn't
  // interfere with the loop.
  for (const subscriber of Array.from(subscribers)) {
    try {
      subscriber(event);
    } catch {
      /* ignore a single failing subscriber */
    }
  }
}