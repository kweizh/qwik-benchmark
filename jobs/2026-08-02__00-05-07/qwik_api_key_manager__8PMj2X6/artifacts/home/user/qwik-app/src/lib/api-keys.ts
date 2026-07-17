import { createHash, randomInt } from "node:crypto";
import { getDb } from "./db";

export interface ApiKeyRecord {
  id: number;
  name: string;
  key_prefix: string;
  hashed_key: string;
  status: "active" | "revoked";
  created_at: string;
}

export type PublicApiKey = Omit<ApiKeyRecord, "hashed_key">;

const KEY_PREFIX = "qk_";
const RANDOM_PART_LENGTH = 32;
const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Generates a cryptographically-random alphanumeric string of the given length. */
function randomAlphanumeric(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[randomInt(ALPHANUMERIC.length)];
  }
  return result;
}

/** Generates a new plain-text API key, e.g. `qk_AbCd1234...` (35 chars total). */
export function generatePlainKey(): string {
  return `${KEY_PREFIX}${randomAlphanumeric(RANDOM_PART_LENGTH)}`;
}

/** SHA-256 hex digest of the given plain text key. */
export function hashKey(plainKey: string): string {
  return createHash("sha256").update(plainKey, "utf8").digest("hex");
}

/** The first 7 characters of the key (e.g. `qk_` + 4 chars) used for display purposes. */
export function extractPrefix(plainKey: string): string {
  return plainKey.slice(0, 7);
}

function toPublic(record: ApiKeyRecord): PublicApiKey {
  const { hashed_key, ...rest } = record;
  return rest;
}

export function createApiKey(name: string): {
  record: PublicApiKey;
  plainKey: string;
} {
  const db = getDb();
  const plainKey = generatePlainKey();
  const keyPrefix = extractPrefix(plainKey);
  const hashedKey = hashKey(plainKey);
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(
    `INSERT INTO api_keys (name, key_prefix, hashed_key, status, created_at)
     VALUES (?, ?, ?, 'active', ?)`,
  );
  const info = stmt.run(name, keyPrefix, hashedKey, createdAt);

  const record: ApiKeyRecord = {
    id: Number(info.lastInsertRowid),
    name,
    key_prefix: keyPrefix,
    hashed_key: hashedKey,
    status: "active",
    created_at: createdAt,
  };

  return { record: toPublic(record), plainKey };
}

export function listApiKeys(): PublicApiKey[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, key_prefix, status, created_at
       FROM api_keys
       ORDER BY id DESC`,
    )
    .all() as PublicApiKey[];
  return rows;
}

export function revokeApiKey(id: number): boolean {
  const db = getDb();
  const info = db
    .prepare(`UPDATE api_keys SET status = 'revoked' WHERE id = ?`)
    .run(id);
  return info.changes > 0;
}

export function findActiveKeyByPlainKey(
  plainKey: string,
): ApiKeyRecord | undefined {
  const db = getDb();
  const hashedKey = hashKey(plainKey);
  const row = db
    .prepare(
      `SELECT id, name, key_prefix, hashed_key, status, created_at
       FROM api_keys
       WHERE hashed_key = ? AND status = 'active'`,
    )
    .get(hashedKey) as ApiKeyRecord | undefined;
  return row;
}
