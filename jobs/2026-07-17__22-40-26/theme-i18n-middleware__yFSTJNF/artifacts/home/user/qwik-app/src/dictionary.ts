import type { Locale } from "./preferences";

/**
 * In-repo translation dictionary. Keys used by the home page must always be
 * present for every supported locale.
 */
export interface Dictionary {
  title: string;
  greeting: string;
}

export const DICTIONARY: Record<Locale, Dictionary> = {
  en: {
    title: "Preferences",
    greeting: "Hello",
  },
  es: {
    title: "Preferencias",
    greeting: "Hola",
  },
};

export function translate(locale: Locale): Dictionary {
  return DICTIONARY[locale];
}