import { component$, isDev, useServerData } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts[0].trim();
    const value = parts.slice(1).join("=").trim();
    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  });
  return cookies;
}

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  const requestHeaders = useServerData<Record<string, string>>("requestHeaders");
  
  let cookieHeader: string | undefined = undefined;
  if (typeof document !== "undefined") {
    cookieHeader = document.cookie;
  } else if (requestHeaders) {
    cookieHeader = requestHeaders["cookie"] || requestHeaders["Cookie"];
  }

  const cookies = parseCookies(cookieHeader);
  const userThemeCookie = cookies["user_theme"];

  const theme = {
    primaryColor: "#00bcd4",
    fontSize: "16px",
    borderRadius: "4px",
  };

  if (userThemeCookie) {
    try {
      const parsed = JSON.parse(userThemeCookie);
      if (parsed && typeof parsed === "object") {
        if (parsed.primaryColor) theme.primaryColor = parsed.primaryColor;
        if (parsed.fontSize) theme.fontSize = parsed.fontSize;
        if (parsed.borderRadius) theme.borderRadius = parsed.borderRadius;
      }
    } catch {
      // ignore
    }
  }

  const cssString = `
    :root {
      --primary-color: ${theme.primaryColor};
      --font-size: ${theme.fontSize};
      --border-radius: ${theme.borderRadius};
    }
  `;

  return (
    <QwikCityProvider>
      <head>
        <meta charset="utf-8" />
        {!isDev && (
          <link
            rel="manifest"
            href={`${import.meta.env.BASE_URL}manifest.json`}
          />
        )}
        <RouterHead />
        <style id="theme-variables" dangerouslySetInnerHTML={cssString} />
      </head>
      <body lang="en">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
