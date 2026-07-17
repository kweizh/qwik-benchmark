/**
 * A minimal in-memory mock of a Redis-like key-value store.
 *
 * It only supports what the rate limiter needs: incrementing a counter for a
 * given key, and cleaning up keys that belong to expired (past) windows so
 * the store doesn't grow indefinitely.
 */
class MockRedisStore {
  private store = new Map<string, number>();

  /**
   * Increments the counter for `key` and returns the new value.
   * If the key doesn't exist yet, it is initialized to `1`.
   */
  increment(key: string): number {
    const next = (this.store.get(key) ?? 0) + 1;
    this.store.set(key, next);
    return next;
  }

  /**
   * Removes every key whose embedded window id is older than
   * `currentWindowId`. Keys are expected to be formatted as
   * `ratelimit:<ip>:<windowId>`.
   */
  cleanup(currentWindowId: number): void {
    for (const key of this.store.keys()) {
      const windowId = Number(key.slice(key.lastIndexOf(":") + 1));
      if (Number.isFinite(windowId) && windowId < currentWindowId) {
        this.store.delete(key);
      }
    }
  }

  /** Returns a plain-object snapshot of the current store state. */
  getAll(): Record<string, number> {
    return Object.fromEntries(this.store.entries());
  }
}

// A single, shared, module-level instance so state persists across requests
// for the lifetime of the server process.
export const mockRedis = new MockRedisStore();
