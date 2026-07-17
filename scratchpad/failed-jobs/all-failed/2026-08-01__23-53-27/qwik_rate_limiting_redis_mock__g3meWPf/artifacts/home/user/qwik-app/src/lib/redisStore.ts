export class MockRedisStore {
  private store = new Map<string, number>();

  cleanup() {
    const currentWindowId = Math.floor(Date.now() / 10000);
    for (const key of this.store.keys()) {
      const parts = key.split(':');
      const windowId = parseInt(parts[parts.length - 1], 10);
      if (isNaN(windowId) || windowId < currentWindowId) {
        this.store.delete(key);
      }
    }
  }

  increment(key: string): number {
    this.cleanup();
    const current = this.store.get(key) || 0;
    const next = current + 1;
    this.store.set(key, next);
    return next;
  }

  get(key: string): number {
    this.cleanup();
    return this.store.get(key) || 0;
  }

  getAllKeys(): Record<string, number> {
    this.cleanup();
    const result: Record<string, number> = {};
    for (const [key, val] of this.store.entries()) {
      result[key] = val;
    }
    return result;
  }

  clear() {
    this.store.clear();
  }
}

export const mockRedisStore = new MockRedisStore();
