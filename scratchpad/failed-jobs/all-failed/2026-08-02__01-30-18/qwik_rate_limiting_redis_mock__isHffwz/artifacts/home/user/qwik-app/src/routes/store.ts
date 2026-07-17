export const rateLimitStore =
  (globalThis as any).__rateLimitStore || new Map<string, number>();
(globalThis as any).__rateLimitStore = rateLimitStore;

export function getStoreState() {
  const keys: Record<string, number> = {};
  for (const [key, value] of rateLimitStore.entries()) {
    keys[key] = value;
  }
  return { keys };
}

export function cleanExpiredKeys(currentWindowId: number) {
  for (const key of rateLimitStore.keys()) {
    const parts = key.split(":");
    const windowId = parseInt(parts[parts.length - 1], 10);
    if (isNaN(windowId) || windowId < currentWindowId) {
      rateLimitStore.delete(key);
    }
  }
}
