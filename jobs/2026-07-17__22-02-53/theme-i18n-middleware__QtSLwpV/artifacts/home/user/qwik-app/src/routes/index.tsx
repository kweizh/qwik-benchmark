import { component$, useContext } from "@builder.io/qwik";
import { Form } from "@builder.io/qwik-city";
import { PreferencesContext, useSetPreferences } from "./layout";
import { dictionary } from "../i18n";

export default component$(() => {
  const state = useContext(PreferencesContext);
  const setPreferences = useSetPreferences();

  const t = dictionary[state.locale];

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>{t.title}</h1>
      <p>{t.greeting}</p>

      <Form action={setPreferences} style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label for="theme" style={{ fontWeight: "bold" }}>Theme</label>
          <select id="theme" name="theme" value={state.theme} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label for="locale" style={{ fontWeight: "bold" }}>Language</label>
          <select id="locale" name="locale" value={state.locale} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <button type="submit" style={{ padding: "0.5rem 1rem", backgroundColor: "#0070f3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
          Save
        </button>
      </Form>
    </main>
  );
});
