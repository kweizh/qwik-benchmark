/**
 * Minimal ambient type declarations for `better-sqlite3`.
 *
 * The installed `better-sqlite3` package (v12) does not ship its own type
 * definitions and `@types/better-sqlite3` is not available offline. This file
 * declares just the surface area used by `src/db.server.ts` so the project
 * type-checks cleanly.
 */
declare module "better-sqlite3" {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement {
    run(...params: unknown[]): RunResult;
    get<T = unknown>(...params: unknown[]): T | undefined;
    all<T = unknown>(...params: unknown[]): T[];
  }

  export interface Database {
    pragma(pragma: string): unknown;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    close(): void;
  }

  const Database: new (
    filename: string,
    options?: Record<string, unknown>,
  ) => Database;

  export default Database;
}