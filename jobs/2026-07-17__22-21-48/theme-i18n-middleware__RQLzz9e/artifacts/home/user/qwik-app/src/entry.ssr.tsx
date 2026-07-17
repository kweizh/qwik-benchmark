/**
 * WHAT IS THIS FILE?
 *
 * SSR entry point, in all cases the application is rendered outside the browser, this
 * entry point will be the common one.
 *
 * - Server (express, cloudflare...)
 * - npm run start
 * - npm run preview
 * - npm run build
 *
 */
import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import Root from "./root";

/**
 * Parse a raw `Cookie` request header into a simple `{ name: value }` record.
 * Cookie values are not URL-decoded here because our cookie values are simple
 * tokens (`light`/`dark`, `en`/`es`).
 */
function parseCookies(cookieHeader: string | undefined | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) {
    return cookies;
  }
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    cookies[key] = value;
  }
  return cookies;
}

export default function (opts: RenderToStreamOptions) {
  // The render options expose `serverData` (populated by Qwik City's request
  // handler), which includes `requestHeaders` (a plain object of lowercased
  // request headers) and `locale` (the value set via `ev.locale(...)` in the
  // root layout's `onRequest` middleware). We use these to compute the
  // `<html>` container attributes so the very first server response already
  // reflects the correct theme and language — with no client-side flash.
  const serverData = opts.serverData ?? {};
  const requestHeaders = (serverData.requestHeaders ?? {}) as Record<string, string>;
  const cookies = parseCookies(requestHeaders.cookie);

  const theme =
    cookies.theme === "dark" || cookies.theme === "light" ? cookies.theme : "light";
  const locale =
    serverData.locale === "es" || serverData.locale === "en" ? serverData.locale : "en";

  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    // Keep `...opts.containerAttributes` first so routing attributes (e.g.
    // `q:route`) are preserved, then override `lang` and add `data-theme`.
    containerAttributes: {
      ...opts.containerAttributes,
      "data-theme": theme,
      lang: locale,
    },
    serverData: {
      ...opts.serverData,
    },
  });
}