import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

const DEFAULT_THEME = {
  primaryColor: "#00bcd4",
  fontSize: "16px",
  borderRadius: "4px",
};

export const useThemeData = routeLoader$(({ cookie }) => {
  const themeCookie = cookie.get("user_theme");
  if (themeCookie) {
    try {
      const parsed = JSON.parse(themeCookie.value);
      return {
        primaryColor: parsed.primaryColor || DEFAULT_THEME.primaryColor,
        fontSize: parsed.fontSize || DEFAULT_THEME.fontSize,
        borderRadius: parsed.borderRadius || DEFAULT_THEME.borderRadius,
      };
    } catch {
      // Invalid JSON
    }
  }
  return DEFAULT_THEME;
});

export const head: DocumentHead = ({ resolveValue }) => {
  const theme = resolveValue(useThemeData);

  return {
    styles: [
      {
        key: "theme-variables",
        style: `:root {
  --primary-color: ${theme.primaryColor};
  --font-size: ${theme.fontSize};
  --border-radius: ${theme.borderRadius};
}`,
      },
    ],
  };
};

export default component$(() => {
  return <Slot />;
});
