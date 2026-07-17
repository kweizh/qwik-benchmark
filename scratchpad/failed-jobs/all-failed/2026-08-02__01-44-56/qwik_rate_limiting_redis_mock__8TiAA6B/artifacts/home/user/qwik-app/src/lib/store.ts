class MockRedisStore {
  private store = new Map<string, number>();

  constructor() {
    if (typeof setInterval !== "undefined") {
      const interval = setInterval(() => {
        this.cleanup();
      }, 10000);
      if (interval && typeof interval.unref === "function") {
        interval.unref();
      }
    }
  }

  incr(key: string): number {
    this.cleanup();
    const current = this.store.get(key) || 0;
    const next = current + 1;
    this.store.set(key, next);
    return next;
  }

  cleanup() {
    const currentWindow = Math.floor(Date.now() / 10000);
    for (const key of this.store.keys()) {
      if (key.startsWith("ratelimit:")) {
        const lastColonIdx = key.lastIndexOf(":");
        if (lastColonIdx !== -1) {
          const windowIdStr = key.substring(lastColonIdx + 1);
          const windowId = parseInt(windowIdStr, 10);
          if (isNaN(windowId) || windowId < currentWindow) {
            this.store.delete(key);
          }
        }
      }
    }
  }

  getState() {
    this.cleanup();
    const keys: Record<string, number> = {};
    for (const [key, val] of this.store.entries()) {
      keys[key] = val;
    }
    return { keys };
  }

  clear() {
    this.store.clear();
  }
}

const globalStore = globalThis as any;
if (!globalStore.__mockRedisStore) {
  globalStore.__mockRedisStore = new MockRedisStore();
}

export const mockRedisStore = globalStore.__mockRedisStore as MockRedisStore;
