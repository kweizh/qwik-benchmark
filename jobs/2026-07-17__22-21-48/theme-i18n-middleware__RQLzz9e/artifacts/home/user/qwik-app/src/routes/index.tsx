import { component$, useContext } from "@builder.io/qwik";
import { Form, type DocumentHead } from "@builder.io/qwik-city";
import {
  LOCALES,
  PreferencesContext,
  THEMES,
  translations,
} from "./preferences";
import { useSavePreferences } from "./layout";

export default component$(() => {
  // Consume the preferences published by the root layout via Context.
  const prefs = useContext(PreferencesContext);
  const save = useSavePreferences();

  // Look up the user-facing strings in the local, in-repo dictionary.
  const dict = translations[prefs.locale];

  return (
    <>
      <h1>{dict.title}</h1>
      <p>{dict.greeting}</p>

      <Form action={save}>
        <fieldset>
          <legend>Theme</legend>
          {THEMES.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="theme"
                value={value}
                defaultChecked={prefs.theme === value}
              />
              {value}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Locale</legend>
          {LOCALES.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="locale"
                value={value}
                defaultChecked={prefs.locale === value}
              />
              {value}
            </label>
          ))}
        </fieldset>

        <button type="submit">Save</button>
      </Form>
    </>
  );
});

export const head: DocumentHead = {
  title: "Preferences",
  meta: [
    {
      name: "description",
      content: "Theme and locale preferences",
    },
  ],
};