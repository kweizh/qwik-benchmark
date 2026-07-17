import { component$, Slot, createContextId, useContextProvider, useStore, useTask$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, type RequestHandler } from "@builder.io/qwik-city";

export interface PreferencesState {
  theme: "light" | "dark";
  locale: "en" | "es";
}

export const PreferencesContext = createContextId<PreferencesState>("preferences-context");

export const onRequest: RequestHandler = async (event) => {
  const themeCookie = event.cookie.get("theme")?.value;
  const localeCookie = event.cookie.get("locale")?.value;

  const theme = (themeCookie === "light" || themeCookie === "dark") ? themeCookie : "light";
  const locale = (localeCookie === "en" || localeCookie === "es") ? localeCookie : "en";

  event.sharedMap.set("theme", theme);
  event.sharedMap.set("locale", locale);
  event.locale(locale);

  await event.next();
};

export const usePreferences = routeLoader$((event) => {
  const theme = (event.sharedMap.get("theme") as "light" | "dark") || "light";
  const locale = (event.sharedMap.get("locale") as "en" | "es") || "en";
  return { theme, locale };
});

export const useSetPreferences = routeAction$(async (data, event) => {
  const theme = data.theme as string;
  const locale = data.locale as string;

  if (theme === "light" || theme === "dark") {
    event.cookie.set("theme", theme, { path: "/" });
  }
  if (locale === "en" || locale === "es") {
    event.cookie.set("locale", locale, { path: "/" });
  }

  return { success: true };
});

export default component$(() => {
  const preferences = usePreferences();
  
  const state = useStore<PreferencesState>({
    theme: preferences.value.theme,
    locale: preferences.value.locale,
  });

  useTask$(({ track }) => {
    track(() => preferences.value);
    state.theme = preferences.value.theme;
    state.locale = preferences.value.locale;
  });

  useContextProvider(PreferencesContext, state);

  return <Slot />;
});
