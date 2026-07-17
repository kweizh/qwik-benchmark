import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * One-way hash a plaintext password using scrypt with a random salt.
 * The plaintext password is never persisted anywhere.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/** Verify a plaintext password against a previously generated hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) {
    return false;
  }
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = scryptSync(password, salt, keyBuffer.length);
  return keyBuffer.length === derivedKey.length
    ? timingSafeEqual(keyBuffer, derivedKey)
    : false;
}
