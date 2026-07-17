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

function getCookieValue(cookieHeader: string, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [key, val] = cookie.trim().split("=");
    if (key === name) {
      return decodeURIComponent(val);
    }
  }
  return undefined;
}

export default function (opts: RenderToStreamOptions) {
  const cookieHeader = opts.serverData?.requestHeaders?.cookie || opts.serverData?.requestHeaders?.Cookie || "";
  const themeCookie = getCookieValue(cookieHeader, "theme");
  const theme = (themeCookie === "light" || themeCookie === "dark") ? themeCookie : "light";

  const localeCookie = getCookieValue(cookieHeader, "locale");
  const locale = opts.serverData?.locale || (localeCookie === "en" || localeCookie === "es" ? localeCookie : "en");

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
