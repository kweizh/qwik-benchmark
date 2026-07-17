import { component$ } from "@builder.io/qwik";
import { routeLoader$, type RequestHandler } from "@builder.io/qwik-city";

export const useThemeLoader = routeLoader$(({ cookie, sharedMap }) => {
  const error = sharedMap.get("error") as string | undefined;
  const cookieValue = cookie.get("user_theme");
  
  let theme = {
    primaryColor: "#00bcd4",
    fontSize: "16px",
    borderRadius: "4px",
  };

  if (cookieValue) {
    try {
      const parsed = cookieValue.json() as any;
      if (parsed && typeof parsed === "object") {
        theme = {
          primaryColor: parsed.primaryColor || theme.primaryColor,
          fontSize: parsed.fontSize || theme.fontSize,
          borderRadius: parsed.borderRadius || theme.borderRadius,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    theme,
    error,
  };
});

export const onPost: RequestHandler = async ({ request, cookie, status, redirect, sharedMap }) => {
  const formData = await request.formData();
  const primaryColor = formData.get("primaryColor")?.toString() || "";
  const fontSize = formData.get("fontSize")?.toString() || "";
  const borderRadius = formData.get("borderRadius")?.toString() || "";

  // Validation
  const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!hexRegex.test(primaryColor)) {
    status(400);
    sharedMap.set("error", "invalid primaryColor");
    return;
  }

  const fontSizeRegex = /^[0-9]+(\.[0-9]+)?(px|rem|em)$/;
  if (!fontSizeRegex.test(fontSize)) {
    status(400);
    sharedMap.set("error", "invalid fontSize");
    return;
  }

  const borderRadiusRegex = /^[0-9]+(\.[0-9]+)?(px|rem|em|%)$/;
  if (!borderRadiusRegex.test(borderRadius)) {
    status(400);
    sharedMap.set("error", "invalid borderRadius");
    return;
  }

  // Success: set cookie with path=/ and redirect
  cookie.set(
    "user_theme",
    JSON.stringify({
      primaryColor,
      fontSize,
      borderRadius,
    }),
    { path: "/" }
  );

  throw redirect(302, "/theme");
};

export default component$(() => {
  const data = useThemeLoader();

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Custom CSS Theme Editor</h1>
      
      {data.value.error && (
        <div id="error-message" style={{ color: "red", marginBottom: "15px", fontWeight: "bold" }}>
          {data.value.error}
        </div>
      )}

      <form method="POST" action="/theme" style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Primary Color:</label>
          <input
            type="text"
            name="primaryColor"
            value={data.value.theme.primaryColor}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "var(--border-radius)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Font Size:</label>
          <input
            type="text"
            name="fontSize"
            value={data.value.theme.fontSize}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "var(--border-radius)" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Border Radius:</label>
          <input
            type="text"
            name="borderRadius"
            value={data.value.theme.borderRadius}
            style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "var(--border-radius)" }}
          />
        </div>

        <button
          type="submit"
          style={{
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            padding: "10px",
            fontSize: "var(--font-size)",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Save Theme
        </button>
      </form>

      <hr style={{ margin: "20px 0", maxWidth: "300px" }} />

      <form method="POST" action="/theme/reset">
        <button
          type="submit"
          style={{
            backgroundColor: "#f44336",
            color: "white",
            border: "none",
            padding: "10px",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            maxWidth: "300px",
            width: "100%"
          }}
        >
          Reset Theme
        </button>
      </form>
    </div>
  );
});
