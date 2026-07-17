import { component$, useContext } from "@builder.io/qwik";
import { Form, type DocumentHead } from "@builder.io/qwik-city";
import { PreferencesContext, useSavePreferences } from "./layout";
import { t } from "~/i18n/translations";

export default component$(() => {
  const preferences = useContext(PreferencesContext);
  const action = useSavePreferences();
  const dict = t(preferences.locale);

  return (
    <>
      <h1>{dict.title}</h1>
      <p>{dict.greeting}</p>

      <Form action={action}>
        <fieldset>
          <legend>{dict.themeLabel}</legend>
          <label>
            <input
              type="radio"
              name="theme"
              value="light"
              checked={preferences.theme === "light"}
            />
            {dict.light}
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={preferences.theme === "dark"}
            />
            {dict.dark}
          </label>
        </fieldset>

        <fieldset>
          <legend>{dict.localeLabel}</legend>
          <label>
            <input
              type="radio"
              name="locale"
              value="en"
              checked={preferences.locale === "en"}
            />
            English
          </label>
          <label>
            <input
              type="radio"
              name="locale"
              value="es"
              checked={preferences.locale === "es"}
            />
            Español
          </label>
        </fieldset>

        <button type="submit">{dict.save}</button>
      </Form>
    </>
  );
});

export const head: DocumentHead = {
  title: "Preferences",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
