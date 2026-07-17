import { component$, isDev, isServer, useServerData } from "@builder.io/qwik";
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

  const qwikCityEnv = useServerData<any>("qwikcity");
  let theme = {
    primaryColor: "#00bcd4",
    fontSize: "16px",
    borderRadius: "4px",
  };

  if (isServer) {
    const cookie = qwikCityEnv?.ev?.cookie?.get("user_theme");
    if (cookie) {
      try {
        theme = cookie.json();
      } catch {
        // ignore
      }
    }
  } else {
    const match = document.cookie.match(/(^|;)\s*user_theme\s*=\s*([^;]+)/);
    if (match) {
      try {
        theme = JSON.parse(decodeURIComponent(match[2]));
      } catch {
        // ignore
      }
    }
  }

  const primaryColor = theme?.primaryColor || "#00bcd4";
  const fontSize = theme?.fontSize || "16px";
  const borderRadius = theme?.borderRadius || "4px";

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
