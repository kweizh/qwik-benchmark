// Server-only in-memory pub/sub hub for the collaborative notepad.
// This module must only be imported from server-side endpoint code so that
// its state (and the Node-only APIs it may eventually rely on) never leaks
// into the client bundle.

export interface NotepadEdit {
  text: string;
  clientId: string;
}

type Subscriber = (edit: NotepadEdit) => void;

class NotepadHub {
  private text = "";
  private subscribers = new Set<Subscriber>();

  /** Returns the latest known document text. */
  getText(): string {
    return this.text;
  }

  /**
   * Updates the stored document text and notifies every currently
   * connected subscriber (SSE client) about the edit.
   */
  publish(edit: NotepadEdit): void {
    this.text = edit.text;
    for (const subscriber of this.subscribers) {
      subscriber(edit);
    }
  }

  /**
   * Registers a new subscriber. Returns an `unsubscribe` function that
   * MUST be called when the client disconnects to avoid leaking memory.
   */
  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }
}

// A single, module-scoped instance shared by every request handled by this
// server process. This is intentionally a simple in-memory singleton, no
// external services or databases are involved.
export const notepadHub = new NotepadHub();
