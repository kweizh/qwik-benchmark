import {
  component$,
  Slot,
  useContextProvider,
} from "@builder.io/qwik";
import {
  routeAction$,
  routeLoader$,
  type RequestHandler,
} from "@builder.io/qwik-city";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  PREFERENCES_SHARED_KEY,
  PreferencesContext,
  resolveLocale,
  resolveTheme,
  type Locale,
  type Preferences,
  type Theme,
} from "./preferences";

/**
 * Shared route middleware.
 *
 * Runs on every request (before any loader/action). It reads the `theme` and
 * `locale` cookies, resolves them to valid values (falling back to the defaults
 * when a cookie is missing or invalid) and:
 *   - stores the resolved `{ theme, locale }` on the request-scoped
 *     `sharedMap` so the `routeLoader$` below can read it;
 *   - calls `ev.locale(locale)` so the SSR entry can read it back through
 *     `serverData.locale` to set the `<html lang>` attribute.
 */
export const onRequest: RequestHandler = (ev) => {
  const theme = resolveTheme(ev.cookie.get("theme")?.value ?? null);
  const locale = resolveLocale(ev.cookie.get("locale")?.value ?? null);

  const prefs: Preferences = { theme, locale };
  ev.sharedMap.set(PREFERENCES_SHARED_KEY, prefs);
  ev.locale(locale);
};

/**
 * Exposes the resolved `{ theme, locale }` for the current request.
 *
 * The middleware always populates `sharedMap` first, so we simply read it back
 * here. A defensive fallback re-reads the cookies in case the middleware did
 * not run for some reason.
 */
export const usePreferences = routeLoader$<Preferences>((ev) => {
  const stored = ev.sharedMap.get(PREFERENCES_SHARED_KEY) as
    | Preferences
    | undefined;
  if (stored) {
    return stored;
  }
  const theme = resolveTheme(ev.cookie.get("theme")?.value ?? null);
  const locale = resolveLocale(ev.cookie.get("locale")?.value ?? null);
  const prefs: Preferences = { theme, locale };
  ev.sharedMap.set(PREFERENCES_SHARED_KEY, prefs);
  return prefs;
});

/**
 * Persists the chosen `theme` and `locale` into cookies.
 *
 * Submitted via the Qwik City `<Form>` component with two fields named exactly
 * `theme` and `locale`. The cookies are set with `path=/` so they apply to
 * every route and survive across requests.
 *
 * Because Qwik City runs all route loaders *after* a successful action, we also
 * update the `sharedMap` (and the request locale) here so the loader re-run and
 * the re-render immediately reflect the new preferences.
 */
export const useSavePreferences = routeAction$(async (data, ev) => {
  const rawTheme = typeof data.theme === "string" ? data.theme : null;
  const rawLocale = typeof data.locale === "string" ? data.locale : null;

  const theme: Theme = resolveTheme(rawTheme);
  const locale: Locale = resolveLocale(rawLocale);

  ev.cookie.set("theme", theme, { path: "/" });
  ev.cookie.set("locale", locale, { path: "/" });

  const prefs: Preferences = { theme, locale };
  ev.sharedMap.set(PREFERENCES_SHARED_KEY, prefs);
  ev.locale(locale);

  return prefs;
});

/**
 * Root layout component.
 *
 * Publishes the resolved preferences through a Qwik Context so any descendant
 * component can consume them with `useContext(PreferencesContext)`.
 */
export default component$(() => {
  const prefs = usePreferences();
  useContextProvider(PreferencesContext, prefs.value);
  return <Slot />;
});

// Re-export the defaults so consumers (and tests) can reference the canonical
// fallback values from a single place.
export { DEFAULT_THEME, DEFAULT_LOCALE };