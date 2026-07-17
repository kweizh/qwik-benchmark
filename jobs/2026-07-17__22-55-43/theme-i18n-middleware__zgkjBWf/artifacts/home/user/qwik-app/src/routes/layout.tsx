import {
  component$,
  createContextId,
  Slot,
  useContextProvider,
} from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";
import { routeAction$, routeLoader$, zod$, z } from "@builder.io/qwik-city";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  PREFERENCES_SHARED_MAP_KEY,
  resolveLocale,
  resolveTheme,
  type Preferences,
} from "~/i18n/preferences";

/**
 * Context used to expose the resolved `{ theme, locale }` preferences to any
 * descendant component in the tree via `useContext`.
 */
export const PreferencesContext =
  createContextId<Preferences>("app.preferences");

/**
 * Shared route middleware: reads the `theme` / `locale` cookies on every
 * request, resolves them to valid values (falling back to the defaults when
 * missing/invalid), stores the result on `sharedMap` (so `routeLoader$` can
 * read it), and sets the request locale so the SSR entry point can read it
 * back via `serverData.locale`.
 */
export const onRequest: RequestHandler = (requestEvent) => {
  const theme = resolveTheme(requestEvent.cookie.get("theme")?.value);
  const locale = resolveLocale(requestEvent.cookie.get("locale")?.value);

  const preferences: Preferences = { theme, locale };

  requestEvent.sharedMap.set(PREFERENCES_SHARED_MAP_KEY, preferences);
  // Makes the resolved locale available to the SSR entry via `serverData.locale`.
  requestEvent.locale(locale);
};

/**
 * Exposes the resolved `{ theme, locale }` (computed by the `onRequest`
 * middleware above) for the current request.
 */
export const useUserPreferences = routeLoader$(({ sharedMap }) => {
  return (
    (sharedMap.get(PREFERENCES_SHARED_MAP_KEY) as Preferences | undefined) ?? {
      theme: DEFAULT_THEME,
      locale: DEFAULT_LOCALE,
    }
  );
});

/**
 * Persists the chosen `theme` and `locale` into cookies (path=/) so the
 * choice survives across requests.
 */
export const useSavePreferences = routeAction$(
  (data, requestEvent) => {
    requestEvent.cookie.set("theme", data.theme, { path: "/" });
    requestEvent.cookie.set("locale", data.locale, { path: "/" });
    return { success: true };
  },
  zod$({
    theme: z.enum(["light", "dark"]),
    locale: z.enum(["en", "es"]),
  }),
);

export default component$(() => {
  const preferences = useUserPreferences();

  useContextProvider(PreferencesContext, preferences.value);

  return <Slot />;
});
