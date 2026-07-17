import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import {
  parseThemeCookie,
  THEME_COOKIE_NAME,
  themeToStyleString,
} from "~/lib/theme";

/**
 * Reads the `user_theme` cookie during SSR and resolves it (falling back to
 * defaults) so it can be injected as CSS custom properties in the `<head>`.
 *
 * Exported so nested routes (e.g. `/theme`) can reuse the same resolved
 * value via `useThemeLoader()` without re-reading/parsing the cookie.
 */
export const useThemeLoader = routeLoader$(({ cookie }) => {
  const raw = cookie.get(THEME_COOKIE_NAME)?.value;
  return parseThemeCookie(raw);
});

export const head: DocumentHead = ({ resolveValue }) => {
  const theme = resolveValue(useThemeLoader);

  return {
    styles: [
      {
        key: "theme-variables",
        props: { id: "theme-variables" },
        style: themeToStyleString(theme),
      },
    ],
  };
};

export default component$(() => {
  return <Slot />;
});
