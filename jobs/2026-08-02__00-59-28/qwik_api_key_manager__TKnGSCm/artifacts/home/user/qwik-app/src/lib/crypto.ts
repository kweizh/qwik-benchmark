import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "qk_";
const RANDOM_LENGTH = 32;

/**
 * Generates a random API key string starting with "qk_" followed by 32 random alphanumeric characters.
 * Total length: 35 characters.
 */
export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let random = "";
  const bytes = randomBytes(RANDOM_LENGTH);
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    random += chars[bytes[i] % chars.length];
  }
  return KEY_PREFIX + random;
}

/**
 * Returns the key prefix: first 7 characters of the full key (e.g., "qk_abc1").
 */
export function getKeyPrefix(fullKey: string): string {
  return fullKey.substring(0, 7);
}

/**
 * Returns the SHA-256 hex-encoded hash of the given string.
 */
export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
