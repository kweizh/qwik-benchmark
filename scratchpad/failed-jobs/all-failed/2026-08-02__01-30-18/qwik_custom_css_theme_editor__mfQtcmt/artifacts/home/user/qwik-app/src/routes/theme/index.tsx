import { component$ } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";

export const useThemeLoader = routeLoader$((ev) => {
  const cookie = ev.cookie.get("user_theme");
  let theme = {
    primaryColor: "#00bcd4",
    fontSize: "16px",
    borderRadius: "4px",
  };
  if (cookie) {
    try {
      theme = cookie.json();
    } catch {
      // ignore
    }
  }
  return {
    primaryColor: theme?.primaryColor || "#00bcd4",
    fontSize: theme?.fontSize || "16px",
    borderRadius: theme?.borderRadius || "4px",
  };
});

export const onPost: RequestHandler = async (ev) => {
  const formData = (await ev.parseBody()) as any;
  const primaryColor = formData?.primaryColor;
  const fontSize = formData?.fontSize;
  const borderRadius = formData?.borderRadius;

  // Server-side validation
  if (
    typeof primaryColor !== "string" ||
    !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryColor)
  ) {
    throw ev.html(
      400,
      `<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
  </head>
  <body>
    <h1>invalid primaryColor</h1>
    <p>Please go back and enter a valid hex color code (e.g., #00bcd4 or #f00).</p>
  </body>
</html>`
    );
  }

  if (
    typeof fontSize !== "string" ||
    !/^\d+(\.\d+)?(px|rem|em)$/.test(fontSize)
  ) {
    throw ev.html(
      400,
      `<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
  </head>
  <body>
    <h1>invalid fontSize</h1>
    <p>Please go back and enter a valid CSS length (e.g., 16px, 1rem, or 1em).</p>
  </body>
</html>`
    );
  }

  if (
    typeof borderRadius !== "string" ||
    !/^\d+(\.\d+)?(px|rem|em|%)$/.test(borderRadius)
  ) {
    throw ev.html(
      400,
      `<!DOCTYPE html>
<html>
  <head>
    <title>Error</title>
  </head>
  <body>
    <h1>invalid borderRadius</h1>
    <p>Please go back and enter a valid CSS length or percentage (e.g., 4px, 1rem, 10%).</p>
  </body>
</html>`
    );
  }

  // Success path: set cookie and redirect back to /theme
  const userTheme = {
    primaryColor,
    fontSize,
    borderRadius,
  };
  ev.cookie.set("user_theme", JSON.stringify(userTheme), { path: "/" });
  throw ev.redirect(302, "/theme");
};

export default component$(() => {
  const theme = useThemeLoader();

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      <h1>Custom CSS Theme Editor</h1>
      <p>Customize the look and feel of the application.</p>

      <form method="POST" action="/theme" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label for="primaryColor">Primary Color:</label>
          <input
            type="text"
            id="primaryColor"
            name="primaryColor"
            value={theme.value.primaryColor}
            placeholder="#00bcd4"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label for="fontSize">Font Size:</label>
          <input
            type="text"
            id="fontSize"
            name="fontSize"
            value={theme.value.fontSize}
            placeholder="16px"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label for="borderRadius">Border Radius:</label>
          <input
            type="text"
            id="borderRadius"
            name="borderRadius"
            value={theme.value.borderRadius}
            placeholder="4px"
            style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "opacity 0.2s"
          }}
        >
          Save Theme
        </button>
      </form>

      <div style={{ marginTop: "2rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
        <form method="POST" action="/theme/reset">
          <button
            type="submit"
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Reset to Default Theme
          </button>
        </form>
      </div>

      <p style={{ marginTop: "2rem" }}>
        <a href="/" style={{ color: "var(--primary-color)" }}>&larr; Back to Home</a>
      </p>
    </div>
  );
});
