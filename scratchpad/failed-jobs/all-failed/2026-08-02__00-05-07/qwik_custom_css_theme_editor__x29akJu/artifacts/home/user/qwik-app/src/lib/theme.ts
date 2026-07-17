/**
 * Shared theme configuration, defaults, cookie helpers and validation
 * used both during SSR (root layout) and by the `/theme` editor route.
 */

export interface Theme {
  primaryColor: string;
  fontSize: string;
  borderRadius: string;
}

/** Name of the cookie used to persist the user's theme customizations. */
export const THEME_COOKIE_NAME = "user_theme";

/** Fallback theme values used when no (valid) cookie is present. */
export const DEFAULT_THEME: Theme = {
  primaryColor: "#00bcd4",
  fontSize: "16px",
  borderRadius: "4px",
};

/** Hex color, e.g. `#f00` or `#ff0000`. */
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** CSS length, e.g. `16px`, `1.5rem`, `2em`. */
const LENGTH_REGEX = /^\d+(?:\.\d+)?(?:px|rem|em)$/;

/** CSS length or percentage, e.g. `4px`, `0.5rem`, `50%`. */
const LENGTH_OR_PERCENT_REGEX = /^\d+(?:\.\d+)?(?:px|rem|em|%)$/;

export function isValidPrimaryColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value.trim());
}

export function isValidFontSize(value: string): boolean {
  return LENGTH_REGEX.test(value.trim());
}

export function isValidBorderRadius(value: string): boolean {
  return LENGTH_OR_PERCENT_REGEX.test(value.trim());
}

/**
 * Validates a candidate theme object (e.g. parsed form data).
 * Returns the name of the first invalid field, or `null` if everything is valid.
 */
export function findInvalidField(candidate: {
  primaryColor: string;
  fontSize: string;
  borderRadius: string;
}): "primaryColor" | "fontSize" | "borderRadius" | null {
  if (!isValidPrimaryColor(candidate.primaryColor)) {
    return "primaryColor";
  }
  if (!isValidFontSize(candidate.fontSize)) {
    return "fontSize";
  }
  if (!isValidBorderRadius(candidate.borderRadius)) {
    return "borderRadius";
  }
  return null;
}

/**
 * Safely parses the raw `user_theme` cookie value into a `Theme`, falling
 * back to defaults for any missing/invalid field or JSON parse failure.
 */
export function parseThemeCookie(raw: string | undefined | null): Theme {
  if (!raw) {
    return { ...DEFAULT_THEME };
  }

  try {
    const parsed = JSON.parse(raw);

    const primaryColor =
      typeof parsed?.primaryColor === "string" &&
      isValidPrimaryColor(parsed.primaryColor)
        ? parsed.primaryColor
        : DEFAULT_THEME.primaryColor;

    const fontSize =
      typeof parsed?.fontSize === "string" && isValidFontSize(parsed.fontSize)
        ? parsed.fontSize
        : DEFAULT_THEME.fontSize;

    const borderRadius =
      typeof parsed?.borderRadius === "string" &&
      isValidBorderRadius(parsed.borderRadius)
        ? parsed.borderRadius
        : DEFAULT_THEME.borderRadius;

    return { primaryColor, fontSize, borderRadius };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

/** Builds the `:root { --primary-color: ...; }` CSS text for a given theme. */
export function themeToStyleString(theme: Theme): string {
  return `:root {\n  --primary-color: ${theme.primaryColor};\n  --font-size: ${theme.fontSize};\n  --border-radius: ${theme.borderRadius};\n}`;
}
