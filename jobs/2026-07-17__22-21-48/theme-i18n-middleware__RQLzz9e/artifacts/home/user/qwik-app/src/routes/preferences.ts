import { createContextId } from "@builder.io/qwik";

/**
 * Shared preference types, helpers, Context and the in-repo translation
 * dictionary used by the home page.
 *
 * All of the server-only resolution logic lives in `layout.tsx` (middleware,
 * loader and action). This module only contains the pure, isomorphic pieces
 * that both the layout and the page components need.
 */

export type Theme = "light" | "dark";
export type Locale = "en" | "es";

export const DEFAULT_THEME: Theme = "light";
export const DEFAULT_LOCALE: Locale = "en";

export const THEMES: readonly Theme[] = ["light", "dark"];
export const LOCALES: readonly Locale[] = ["en", "es"];

/** Key under which the resolved preferences are stored on `sharedMap`. */
export const PREFERENCES_SHARED_KEY = "preferences";

/**
 * Resolve a raw cookie value to a valid `Theme`, falling back to the default
 * when the value is missing or not one of the allowed options.
 */
export function resolveTheme(value: string | null | undefined): Theme {
  return value === "dark" || value === "light" ? value : DEFAULT_THEME;
}

/**
 * Resolve a raw cookie value to a valid `Locale`, falling back to the default
 * when the value is missing or not one of the allowed options.
 */
export function resolveLocale(value: string | null | undefined): Locale {
  return value === "es" || value === "en" ? value : DEFAULT_LOCALE;
}

export interface Preferences {
  theme: Theme;
  locale: Locale;
}

/**
 * Qwik Context id used by the root layout to publish the resolved preferences
 * so any descendant component can consume them with `useContext`.
 */
export const PreferencesContext = createContextId<Preferences>(
  "preferences-context"
);

/**
 * Local, in-repo translation dictionary. No network calls, no third-party
 * i18n service. The home page looks up its user-facing strings here.
 */
export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    title: "Preferences",
    greeting: "Hello",
  },
  es: {
    title: "Preferencias",
    greeting: "Hola",
  },
};

export interface TranslationDictionary {
  title: string;
  greeting: string;
}

export type TranslationKey = keyof TranslationDictionary;