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
import {
  parseCookieHeader,
  resolveLocale,
  resolveTheme,
} from "./preferences";

export default function (opts: RenderToStreamOptions) {
  // The Qwik City request handler has already populated
  // `serverData.requestHeaders` (with the Cookie header) and
  // `serverData.locale` (set via `event.locale(...)` from the route
  // middleware). We re-derive the resolved theme + locale here so the very
  // first bytes of the response carry the correct `data-theme` and `lang`
  // attributes on the <html> element -- no client-side JS required.
  const cookieHeader = opts.serverData?.requestHeaders?.cookie as
    | string
    | undefined;
  const cookies = parseCookieHeader(cookieHeader ?? null);

  const theme = resolveTheme(cookies.theme ?? null);
  // Prefer the locale that the middleware resolved through `ev.locale()`,
  // fall back to parsing the cookie ourselves.
  const serverLocale =
    typeof opts.serverData?.locale === "string"
      ? opts.serverData.locale
      : undefined;
  const locale = resolveLocale(
    serverLocale && serverLocale !== "*"
      ? serverLocale
      : cookies.locale ?? null,
  );

  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    // `opts.containerAttributes` is populated by Qwik City with `q:route`,
    // so we must preserve it for routing to keep working. We put our own
    // attributes *after* the spread so they always win.
    containerAttributes: {
      ...opts.containerAttributes,
      lang: locale,
      "data-theme": theme,
    },
    serverData: {
      ...opts.serverData,
      theme,
      locale,
    },
  });
}
