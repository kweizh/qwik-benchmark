import { randomBytes, createHash } from 'crypto';

/**
 * Generates a random alphanumeric string of a given length.
 * Avoids modulo bias by discarding values >= 248 (since 256 % 62 = 8).
 */
export function generateRandomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  while (result.length < length) {
    const bytes = randomBytes(length - result.length);
    for (let i = 0; i < bytes.length; i++) {
      const val = bytes[i];
      if (val < 248) {
        result += chars[val % 62];
      }
    }
  }
  return result;
}

/**
 * Generates a new API key starting with 'qk_' followed by 32 random alphanumeric characters.
 * Total length is 35 characters.
 */
export function generateApiKey(): string {
  const randomPart = generateRandomAlphanumeric(32);
  return `qk_${randomPart}`;
}

/**
 * Returns the SHA-256 hash (hex encoded) of the plain text API key.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Returns the first 7 characters of the key as the prefix.
 */
export function getPrefix(key: string): string {
  return key.substring(0, 7);
}
