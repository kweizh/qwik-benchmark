import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  Form,
} from "@builder.io/qwik-city";

const DEFAULT_THEME = {
  primaryColor: "#00bcd4",
  fontSize: "16px",
  borderRadius: "4px",
};

export const useThemeLoader = routeLoader$(({ cookie }) => {
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

export const useThemeAction = routeAction$(
  (data, { cookie, redirect, fail }) => {
    const primaryColor = data.primaryColor as string;
    const fontSize = data.fontSize as string;
    const borderRadius = data.borderRadius as string;

    // Validate primaryColor: must be valid hex color code
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (!primaryColor || !hexRegex.test(primaryColor)) {
      return fail(400, {
        message: "invalid primaryColor",
      });
    }

    // Validate fontSize: must start with a number and end with px, rem, or em
    const fontSizeRegex = /^\d+(\.\d+)?(px|rem|em)$/;
    if (!fontSize || !fontSizeRegex.test(fontSize)) {
      return fail(400, {
        message: "invalid fontSize",
      });
    }

    // Validate borderRadius: must start with a number and end with px, rem, em, or %
    const borderRadiusRegex = /^\d+(\.\d+)?(px|rem|em|%)$/;
    if (!borderRadius || !borderRadiusRegex.test(borderRadius)) {
      return fail(400, {
        message: "invalid borderRadius",
      });
    }

    // Set the cookie
    const themeValue = JSON.stringify({
      primaryColor,
      fontSize,
      borderRadius,
    });
    cookie.set("user_theme", themeValue, { path: "/" });

    throw redirect(302, "/theme");
  },
);

export default component$(() => {
  const theme = useThemeLoader();
  const action = useThemeAction();

  return (
    <div>
      <h1>Theme Editor</h1>

      {action.value?.message && (
        <p style={{ color: "red" }}>{action.value.message}</p>
      )}

      <Form action={action}>
        <div>
          <label for="primaryColor">Primary Color:</label>
          <input
            id="primaryColor"
            name="primaryColor"
            type="text"
            value={theme.value.primaryColor}
          />
        </div>

        <div>
          <label for="fontSize">Font Size:</label>
          <input
            id="fontSize"
            name="fontSize"
            type="text"
            value={theme.value.fontSize}
          />
        </div>

        <div>
          <label for="borderRadius">Border Radius:</label>
          <input
            id="borderRadius"
            name="borderRadius"
            type="text"
            value={theme.value.borderRadius}
          />
        </div>

        <button type="submit">Save Theme</button>
      </Form>

      <form action="/theme/reset" method="post">
        <button type="submit">Reset to Defaults</button>
      </form>

      <div style={{ marginTop: "2rem" }}>
        <p>
          <a href="/">Back to Home</a>
        </p>
      </div>
    </div>
  );
});
