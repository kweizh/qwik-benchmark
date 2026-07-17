import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  type DocumentHead,
  type RequestHandler,
} from "@builder.io/qwik-city";
import {
  findInvalidField,
  parseThemeCookie,
  THEME_COOKIE_NAME,
  type Theme,
} from "~/lib/theme";

const FORM_ERROR_KEY = "theme-form-error";

/**
 * Handles the theme editor form submission.
 *
 * A plain `<form method="post">` is used (rather than `routeAction$`) so
 * that a bare HTTP POST to `/theme` is validated and processed correctly,
 * with no client-side JavaScript required.
 */
export const onPost: RequestHandler = async (requestEvent) => {
  const body = (await requestEvent.parseBody()) as Record<string, unknown>;

  const candidate = {
    primaryColor: String(body?.primaryColor ?? "").trim(),
    fontSize: String(body?.fontSize ?? "").trim(),
    borderRadius: String(body?.borderRadius ?? "").trim(),
  };

  const invalidField = findInvalidField(candidate);

  if (invalidField) {
    requestEvent.status(400);
    requestEvent.sharedMap.set(FORM_ERROR_KEY, `invalid ${invalidField}`);
    // Falls through to render the page (with the 400 status already set)
    // so the error message can be shown to the user.
    return;
  }

  const theme: Theme = candidate;
  requestEvent.cookie.set(THEME_COOKIE_NAME, JSON.stringify(theme), {
    path: "/",
  });

  throw requestEvent.redirect(302, "/theme/");
};

export const useThemeData = routeLoader$((requestEvent) => {
  const raw = requestEvent.cookie.get(THEME_COOKIE_NAME)?.value;
  const theme = parseThemeCookie(raw);
  const error = requestEvent.sharedMap.get(FORM_ERROR_KEY) as
    | string
    | undefined;
  return { theme, error: error ?? null };
});

export default component$(() => {
  const data = useThemeData();
  const { theme, error } = data.value;

  return (
    <>
      <h1>Theme Editor</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form method="post">
        <div>
          <label for="primaryColor">Primary Color</label>
          <input
            id="primaryColor"
            type="text"
            name="primaryColor"
            value={theme.primaryColor}
          />
        </div>

        <div>
          <label for="fontSize">Font Size</label>
          <input
            id="fontSize"
            type="text"
            name="fontSize"
            value={theme.fontSize}
          />
        </div>

        <div>
          <label for="borderRadius">Border Radius</label>
          <input
            id="borderRadius"
            type="text"
            name="borderRadius"
            value={theme.borderRadius}
          />
        </div>

        <button type="submit">Save Theme</button>
      </form>

      <form method="post" action="/theme/reset/">
        <button type="submit">Reset to Defaults</button>
      </form>
    </>
  );
});

export const head: DocumentHead = {
  title: "Theme Editor",
  meta: [
    {
      name: "description",
      content: "Customize your visual theme preferences",
    },
  ],
};
