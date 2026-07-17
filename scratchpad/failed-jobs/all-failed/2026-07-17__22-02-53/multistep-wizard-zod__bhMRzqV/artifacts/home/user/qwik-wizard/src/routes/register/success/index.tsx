import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useSuccessLoader = routeLoader$(async ({ url, redirect }) => {
  const email = url.searchParams.get("email");
  if (!email) {
    throw redirect(302, "/register/");
  }
  return { email };
});

export default component$(() => {
  const loader = useSuccessLoader();

  return (
    <div class="container">
      <div class="form-card success-card">
        <div class="success-icon">✓</div>
        <h1 class="success-title">Registration Complete!</h1>
        <p class="success-message">
          Thank you for registering. A confirmation email has been sent to{" "}
          <span class="success-email">{loader.value.email}</span>.
        </p>
        <a href="/register/" class="btn btn-primary" style={{ display: "inline-flex", width: "auto" }}>
          Register Another User
        </a>
      </div>
    </div>
  );
});
