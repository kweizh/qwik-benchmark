type Subscriber = (eventText: string) => void;

class NotepadHub {
  private _text: string = "";
  private _subscribers: Set<Subscriber> = new Set();

  get text() {
    return this._text;
  }

  set text(val: string) {
    this._text = val;
  }

  get subscribers() {
    return this._subscribers;
  }

  subscribe(sub: Subscriber): () => void {
    this._subscribers.add(sub);
    return () => {
      this._subscribers.delete(sub);
    };
  }

  broadcast(eventText: string) {
    for (const sub of this._subscribers) {
      try {
        sub(eventText);
      } catch {
        // ignore/log
      }
    }
  }
}

// Store on globalThis to persist across HMR in dev mode
const globalAny = globalThis as any;
if (!globalAny.__notepadHub) {
  globalAny.__notepadHub = new NotepadHub();
}
export const hub = globalAny.__notepadHub as NotepadHub;
