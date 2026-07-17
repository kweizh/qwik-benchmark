/**
 * Minimal ambient type declarations for Node's built-in `node:sqlite` module.
 *
 * The installed `@types/node` version does not yet ship types for this
 * (relatively new) built-in module, even though the Node.js runtime used by
 * this project supports it. These declarations only cover the small surface
 * area actually used by `src/lib/db.ts`.
 */
declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string, options?: Record<string, unknown>);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
