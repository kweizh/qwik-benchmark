import { component$, Slot, useContextProvider } from "@builder.io/qwik";
import {
  routeLoader$,
  type RequestHandler,
} from "@builder.io/qwik-city";
import {
  PreferencesContext,
  SHARED_LOCALE_KEY,
  SHARED_THEME_KEY,
  resolveLocale,
  resolveTheme,
  type Locale,
  type Theme,
} from "../preferences";

/**
 * Per-request middleware. Runs before any routeLoader$ or routeAction$
 * on the page. Reads both cookies, validates them against the supported
 * sets, and stashes the resolved values on the request-scoped sharedMap
 * so the loader and the SSR entry can read them without re-parsing.
 */
export const onRequest: RequestHandler = (ev) => {
  const themeRaw = ev.cookie.get("theme")?.value;
  const localeRaw = ev.cookie.get("locale")?.value;

  const theme: Theme = resolveTheme(themeRaw);
  const locale: Locale = resolveLocale(localeRaw);

  ev.sharedMap.set(SHARED_THEME_KEY, theme);
  ev.sharedMap.set(SHARED_LOCALE_KEY, locale);

  // Inform downstream rendering of the resolved request locale. The SSR
  // entry can read this through `opts.serverData.locale`.
  ev.locale(locale);
};

/**
 * Public loader that exposes the resolved preferences for the current
 * request. The root layout then publishes the same values through a Qwik
 * Context so any descendant component can pick them up.
 */
export const usePreferences = routeLoader$((ev) => {
  const theme =
    (ev.sharedMap.get(SHARED_THEME_KEY) as Theme | undefined) ??
    ("light" as Theme);
  const locale =
    (ev.sharedMap.get(SHARED_LOCALE_KEY) as Locale | undefined) ??
    ("en" as Locale);
  return { theme, locale };
});

export default component$(() => {
  const prefs = usePreferences();
  const value = prefs.value;

  // Publish for descendants so they can read it via
  // `useContext(PreferencesContext)`.
  useContextProvider(PreferencesContext, value);

  return <Slot />;
});
