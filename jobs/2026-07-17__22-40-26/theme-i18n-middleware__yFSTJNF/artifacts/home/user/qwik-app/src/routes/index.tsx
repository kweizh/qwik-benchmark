import { component$, useContext } from "@builder.io/qwik";
import { Form, routeAction$, type DocumentHead } from "@builder.io/qwik-city";
import { translate } from "../dictionary";
import {
  isLocale,
  isTheme,
  PreferencesContext,
  THEME_COOKIE,
  LOCALE_COOKIE,
} from "../preferences";

/**
 * Persist the user's chosen theme + locale into cookies so that subsequent
 * requests reflect the new preferences on the very first server response.
 * The form must submit two fields named exactly `theme` and `locale`.
 */
export const useSavePreferences = routeAction$((form, ev) => {
  const theme = isTheme(form.theme) ? form.theme : "light";
  const locale = isLocale(form.locale) ? form.locale : "en";

  ev.cookie.set(THEME_COOKIE, theme, { path: "/" });
  ev.cookie.set(LOCALE_COOKIE, locale, { path: "/" });

  return { theme, locale };
});

export default component$(() => {
  // Pull the SSR-resolved preferences out of the Context that the root
  // layout populated.
  const prefs = useContext(PreferencesContext);
  const dict = translate(prefs.locale);

  // Resolve the action store once per render so we can pass it to <Form>.
  const action = useSavePreferences();

  return (
    <>
      <h1>{dict.title}</h1>
      <p>{dict.greeting}</p>

      <Form action={action}>
        <label>
          Theme:
          <select name="theme" value={prefs.theme}>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label>
          Locale:
          <select name="locale" value={prefs.locale}>
            <option value="en">en</option>
            <option value="es">es</option>
          </select>
        </label>
        <button type="submit">Save</button>
      </Form>
    </>
  );
});

export const head: DocumentHead = {
  title: "Preferences",
};
