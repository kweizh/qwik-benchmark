/**
 * Local, in-repo translation dictionary.
 * No network calls, no third-party i18n service.
 */

export type Locale = "en" | "es";

export interface Dictionary {
  title: string;
  greeting: string;
  themeLabel: string;
  localeLabel: string;
  light: string;
  dark: string;
  save: string;
}

export const translations: Record<Locale, Dictionary> = {
  en: {
    title: "Preferences",
    greeting: "Hello",
    themeLabel: "Theme",
    localeLabel: "Language",
    light: "Light",
    dark: "Dark",
    save: "Save preferences",
  },
  es: {
    title: "Preferencias",
    greeting: "Hola",
    themeLabel: "Tema",
    localeLabel: "Idioma",
    light: "Claro",
    dark: "Oscuro",
    save: "Guardar preferencias",
  },
};

export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "es";

export const t = (locale: Locale): Dictionary => translations[locale];
