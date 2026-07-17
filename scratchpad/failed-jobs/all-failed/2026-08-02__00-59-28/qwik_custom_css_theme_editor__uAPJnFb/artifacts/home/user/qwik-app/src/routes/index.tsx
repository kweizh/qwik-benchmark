import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div>
      <h1>Qwik Theme Demo</h1>
      <p>
        This page demonstrates server-side theme customization using CSS custom
        properties.
      </p>
      <div class="theme-demo">
        <div class="demo-card">
          <h2>Sample Card</h2>
          <p>
            This card uses the custom theme properties: primary color, font
            size, and border radius.
          </p>
          <button class="demo-button">Themed Button</button>
        </div>
      </div>
      <p style="margin-top: 2rem;">
        <a href="/theme">Customize Theme</a>
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Qwik Theme Demo",
  meta: [
    {
      name: "description",
      content: "Qwik site with customizable theme",
    },
  ],
};
