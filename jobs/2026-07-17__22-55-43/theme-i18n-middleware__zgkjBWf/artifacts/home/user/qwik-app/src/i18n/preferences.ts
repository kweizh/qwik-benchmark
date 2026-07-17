import type { Locale } from "./translations";

export type Theme = "light" | "dark";

export const DEFAULT_THEME: Theme = "light";
export const DEFAULT_LOCALE: Locale = "en";

export const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark";

export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "es";

export interface Preferences {
  theme: Theme;
  locale: Locale;
}

/** Key used to store the resolved preferences on the request's sharedMap. */
export const PREFERENCES_SHARED_MAP_KEY = "preferences";

export const resolveTheme = (value: string | undefined): Theme =>
  isTheme(value) ? value : DEFAULT_THEME;

export const resolveLocale = (value: string | undefined): Locale =>
  isLocale(value) ? value : DEFAULT_LOCALE;
