import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useIndexLoader = routeLoader$(async ({ redirect }) => {
  throw redirect(302, "/register/");
});

export default component$(() => {
  return (
    <div class="container">
      <h1>Redirecting to registration...</h1>
      <p>
        If you are not redirected, <a href="/register/">click here</a>.
      </p>
    </div>
  );
});
