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

function getCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';');
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(name + '=')) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return undefined;
}

export default function (opts: RenderToStreamOptions) {
  const ev = opts.serverData?.qwikcity?.ev;
  const cookieVal = ev?.cookie?.get('user_theme')?.value
    || getCookie(opts.serverData?.requestHeaders?.cookie, 'user_theme');

  let theme = {
    primaryColor: '#00bcd4',
    fontSize: '16px',
    borderRadius: '4px',
  };

  if (cookieVal) {
    try {
      const parsed = typeof cookieVal === 'string' ? JSON.parse(cookieVal) : cookieVal;
      if (parsed && typeof parsed === 'object') {
        theme = {
          primaryColor: parsed.primaryColor || theme.primaryColor,
          fontSize: parsed.fontSize || theme.fontSize,
          borderRadius: parsed.borderRadius || theme.borderRadius,
        };
      }
    } catch (e) {
      // ignore
    }
  }

  const serverData = {
    ...opts.serverData,
    theme,
  };

  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    containerAttributes: {
      lang: "en-us",
      ...opts.containerAttributes,
    },
    serverData,
  });
}
