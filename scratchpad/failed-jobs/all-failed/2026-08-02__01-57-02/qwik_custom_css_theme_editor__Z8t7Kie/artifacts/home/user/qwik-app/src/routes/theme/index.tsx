import { component$ } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";

function validateHexColor(val: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val);
}

function validateFontSize(val: string): boolean {
  return /^[0-9]+(?:\.[0-9]+)?(px|rem|em)$/.test(val);
}

function validateBorderRadius(val: string): boolean {
  return /^[0-9]+(?:\.[0-9]+)?(px|rem|em|%)$/.test(val);
}

export const onPost: RequestHandler = async (event) => {
  const formData = await event.request.formData();
  const primaryColor = formData.get("primaryColor")?.toString() || "";
  const fontSize = formData.get("fontSize")?.toString() || "";
  const borderRadius = formData.get("borderRadius")?.toString() || "";

  if (!validateHexColor(primaryColor)) {
    event.status(400);
    event.sharedMap.set("theme_error", "invalid primaryColor");
    event.sharedMap.set("theme_invalid_values", { primaryColor, fontSize, borderRadius });
    await event.next();
    return;
  }

  if (!validateFontSize(fontSize)) {
    event.status(400);
    event.sharedMap.set("theme_error", "invalid fontSize");
    event.sharedMap.set("theme_invalid_values", { primaryColor, fontSize, borderRadius });
    await event.next();
    return;
  }

  if (!validateBorderRadius(borderRadius)) {
    event.status(400);
    event.sharedMap.set("theme_error", "invalid borderRadius");
    event.sharedMap.set("theme_invalid_values", { primaryColor, fontSize, borderRadius });
    await event.next();
    return;
  }

  // Success path: save cookie and redirect
  event.cookie.set(
    "user_theme",
    JSON.stringify({
      primaryColor,
      fontSize,
      borderRadius,
    }),
    { path: "/" }
  );

  throw event.redirect(302, "/theme");
};

export const useThemeData = routeLoader$((event) => {
  const error = event.sharedMap.get("theme_error");
  const invalidValues = event.sharedMap.get("theme_invalid_values");

  const currentTheme = {
    primaryColor: "#00bcd4",
    fontSize: "16px",
    borderRadius: "4px",
  };

  const cookie = event.cookie.get("user_theme");
  if (cookie) {
    try {
      const parsed = JSON.parse(cookie.value);
      if (parsed && typeof parsed === "object") {
        if (parsed.primaryColor) currentTheme.primaryColor = parsed.primaryColor;
        if (parsed.fontSize) currentTheme.fontSize = parsed.fontSize;
        if (parsed.borderRadius) currentTheme.borderRadius = parsed.borderRadius;
      }
    } catch {
      // ignore
    }
  }

  return {
    theme: invalidValues || currentTheme,
    error: error || null,
  };
});

export default component$(() => {
  const themeData = useThemeData();
  const { theme, error } = themeData.value;

  return (
    <div style={{ padding: "20px", fontFamily: "var(--font-size)" }}>
      <h1>Custom CSS Theme Editor</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "15px", fontWeight: "bold" }}>
          {error}
        </div>
      )}

      <form method="POST" action="/theme" style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Primary Color:</label>
          <input
            type="text"
            name="primaryColor"
            value={theme.primaryColor}
            style={{ width: "100%", padding: "8px", borderRadius: "var(--border-radius)", border: "1px solid var(--primary-color)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Font Size:</label>
          <input
            type="text"
            name="fontSize"
            value={theme.fontSize}
            style={{ width: "100%", padding: "8px", borderRadius: "var(--border-radius)", border: "1px solid var(--primary-color)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Border Radius:</label>
          <input
            type="text"
            name="borderRadius"
            value={theme.borderRadius}
            style={{ width: "100%", padding: "8px", borderRadius: "var(--border-radius)", border: "1px solid var(--primary-color)" }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "10px",
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            fontSize: "var(--font-size)",
          }}
        >
          Save Theme
        </button>
      </form>

      <form method="POST" action="/theme/reset" style={{ marginTop: "15px", maxWidth: "300px" }}>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#ccc",
            color: "black",
            border: "none",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            fontSize: "var(--font-size)",
          }}
        >
          Reset Theme
        </button>
      </form>
    </div>
  );
});
