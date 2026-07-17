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
import { resolveLocale, resolveTheme } from "./i18n/preferences";

/**
 * Parses a raw `Cookie` request header into a plain key/value map.
 */
function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) {
    return result;
  }
  for (const part of cookieHeader.split(";")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(value);
    }
  }
  return result;
}

export default function (opts: RenderToStreamOptions) {
  // The `theme`/`locale` cookies were already resolved server-side by the
  // root layout's `onRequest` middleware, but `containerAttributes` is the
  // only place that can set attributes on the `<html>` tag, and it's
  // computed before that middleware runs. We re-derive the same resolved
  // values here from the raw request headers (for `theme`) and from
  // `serverData.locale` (set via `requestEvent.locale(...)` in the
  // middleware, for `locale`) so the very first server response already
  // carries the correct `data-theme` and `lang` attributes.
  const requestHeaders = (opts.serverData?.requestHeaders ?? {}) as Record<
    string,
    string
  >;
  const cookies = parseCookieHeader(requestHeaders.cookie);

  const theme = resolveTheme(cookies.theme);
  const locale = resolveLocale(
    (opts.serverData?.locale as string | undefined) ?? cookies.locale,
  );

  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    containerAttributes: {
      lang: locale,
      "data-theme": theme,
      ...opts.containerAttributes,
    },
    serverData: {
      ...opts.serverData,
    },
  });
}
