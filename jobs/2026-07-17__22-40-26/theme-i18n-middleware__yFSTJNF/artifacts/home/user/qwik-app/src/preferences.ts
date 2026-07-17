import { createContextId } from "@builder.io/qwik";

/**
 * Theme values supported by the application.
 */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Locales supported by the application.
 */
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_THEME: Theme = "light";
export const DEFAULT_LOCALE: Locale = "en";

export const THEME_COOKIE = "theme";
export const LOCALE_COOKIE = "locale";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveTheme(raw: string | undefined | null): Theme {
  return isTheme(raw) ? raw : DEFAULT_THEME;
}

export function resolveLocale(raw: string | undefined | null): Locale {
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

/**
 * Parse a raw `Cookie` request header into a plain map. Used in places
 * (like the SSR entry) where the full Qwik City request event is not
 * available.
 */
export function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

/**
 * Shape of the values published through Qwik's Context API. Components
 * inside the root layout can read this with `useContext(PreferencesContext)`.
 */
export interface Preferences {
  theme: Theme;
  locale: Locale;
}

/**
 * Shared keys used by the route middleware, routeLoader$, and the SSR
 * entry to stash and retrieve the per-request preferences.
 */
export const SHARED_THEME_KEY = "preferences.theme";
export const SHARED_LOCALE_KEY = "preferences.locale";

/**
 * The Qwik Context ID for the per-request preferences. The root layout
 * provides it via `useContextProvider`; descendants consume it with
 * `useContext`.
 */
export const PreferencesContext = createContextId<Preferences>(
  "app.preferences",
);