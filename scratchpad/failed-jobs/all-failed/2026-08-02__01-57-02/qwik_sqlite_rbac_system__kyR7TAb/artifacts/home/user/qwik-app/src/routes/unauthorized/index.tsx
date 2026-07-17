import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useUnauthorizedLoader = routeLoader$(({ status }) => {
  status(200);
});

export default component$(() => {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "red" }}>Access Denied</h1>
      <p>You are unauthorized to view this page.</p>
      <a href="/" style={{ color: "blue", textDecoration: "underline" }}>Go back home</a>
    </div>
  );
});
