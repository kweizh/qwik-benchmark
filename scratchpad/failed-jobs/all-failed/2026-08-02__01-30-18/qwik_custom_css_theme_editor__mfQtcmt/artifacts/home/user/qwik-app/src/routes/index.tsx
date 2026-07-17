import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h1>Welcome to Qwik Custom CSS Theme Editor!</h1>
      <p style={{ lineHeight: "1.6" }}>
        This application demonstrates server-side rendering (SSR) of dynamic, user-customizable CSS themes.
        The selected theme is stored in a cookie and injected directly into the document head before the HTML is sent to the browser, eliminating any Flash of Unstyled Content (FOUC).
      </p>

      <div style={{
        marginTop: "2rem",
        padding: "1.5rem",
        border: "2px solid var(--primary-color)",
        borderRadius: "var(--border-radius)",
        backgroundColor: "white",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
      }}>
        <h2>Theme Preview Card</h2>
        <p>This card dynamically updates its border, border radius, header color, and button color based on your custom theme settings.</p>
        <button>Sample Theme Button</button>
      </div>

      <p style={{ marginTop: "2rem" }}>
        <a href="/theme" style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          backgroundColor: "var(--primary-color)",
          color: "white",
          borderRadius: "var(--border-radius)",
          fontWeight: "bold",
          textDecoration: "none"
        }}>
          Go to Theme Editor &rarr;
        </a>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik CSS Theme Editor",
  meta: [
    {
      name: "description",
      content: "A dynamic server-side theme editor built with Qwik City",
    },
  ],
};
