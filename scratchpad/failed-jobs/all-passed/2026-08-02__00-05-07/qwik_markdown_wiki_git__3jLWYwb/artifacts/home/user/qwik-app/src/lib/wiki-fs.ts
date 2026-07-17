import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Directory where wiki markdown pages are stored.
 */
export const WIKI_PAGES_DIR = "/home/user/qwik-app/wiki-pages";

/**
 * Sanitizes a slug so it can't be used to escape the wiki-pages directory.
 */
function sanitizeSlug(slug: string): string {
  return slug.replace(/[\\/]/g, "").replace(/\.\./g, "");
}

export function getWikiFilePath(slug: string): string {
  const safeSlug = sanitizeSlug(slug);
  return join(WIKI_PAGES_DIR, `${safeSlug}.md`);
}

export function wikiPageExists(slug: string): boolean {
  return existsSync(getWikiFilePath(slug));
}

export function readWikiPage(slug: string): string {
  return readFileSync(getWikiFilePath(slug), "utf-8");
}

export function writeWikiPage(slug: string, content: string): void {
  if (!existsSync(WIKI_PAGES_DIR)) {
    mkdirSync(WIKI_PAGES_DIR, { recursive: true });
  }
  writeFileSync(getWikiFilePath(slug), content, "utf-8");
}
