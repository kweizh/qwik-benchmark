/**
 * In-memory mock Redis-like key-value store.
 * Used for rate limiting — tracks request counts per IP per time window.
 */
class MockRedisStore {
  private store: Map<string, number> = new Map();

  /**
   * Increment the value for a given key. Returns the new value.
   * If the key does not exist, it is set to 1.
   */
  incr(key: string): number {
    const current = this.store.get(key) ?? 0;
    const next = current + 1;
    this.store.set(key, next);
    return next;
  }

  /**
   * Get the current value for a key (or 0 if not set).
   */
  get(key: string): number {
    return this.store.get(key) ?? 0;
  }

  /**
   * Remove expired keys — those whose window ID is less than the current window.
   * The key format is expected to be `ratelimit:<ip>:<windowId>`.
   */
  cleanupExpired(currentWindowId: number): void {
    for (const key of this.store.keys()) {
      const parts = key.split(":");
      if (parts.length === 3) {
        const windowId = parseInt(parts[2], 10);
        if (!isNaN(windowId) && windowId < currentWindowId) {
          this.store.delete(key);
        }
      }
    }
  }

  /**
   * Return a snapshot of all keys and their values.
   */
  getAll(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.store.entries()) {
      result[key] = value;
    }
    return result;
  }
}

/** Singleton instance shared across all requests. */
export const mockRedis = new MockRedisStore();
