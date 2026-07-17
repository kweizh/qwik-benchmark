import { component$, isDev, useServerData } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { RouterHead } from "./components/router-head/router-head";

import "./global.css";

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */
  const requestHeaders = useServerData<Record<string, string>>("requestHeaders");
  const cookieHeader = requestHeaders?.cookie || requestHeaders?.Cookie;

  let primaryColor = "#00bcd4";
  let fontSize = "16px";
  let borderRadius = "4px";

  if (cookieHeader) {
    const cookies: Record<string, string> = {};
    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
      const parts = pair.split("=");
      const k = parts[0]?.trim();
      const v = parts.slice(1).join("=")?.trim();
      if (k && v) {
        cookies[k] = decodeURIComponent(v);
      }
    }
    const userThemeStr = cookies["user_theme"];
    if (userThemeStr) {
      try {
        const userTheme = JSON.parse(userThemeStr);
        if (userTheme && typeof userTheme === "object") {
          if (userTheme.primaryColor) primaryColor = userTheme.primaryColor;
          if (userTheme.fontSize) fontSize = userTheme.fontSize;
          if (userTheme.borderRadius) borderRadius = userTheme.borderRadius;
        }
      } catch {
        // ignore
      }
    }
  }

  const cssString = `:root {
  --primary-color: ${primaryColor};
  --font-size: ${fontSize};
  --border-radius: ${borderRadius};
}`;

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
        <style id="theme-variables" dangerouslySetInnerHTML={cssString} />
        <RouterHead />
      </head>
      <body lang="en">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
