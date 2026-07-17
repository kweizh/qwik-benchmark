import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";

export const useSuccessData = routeLoader$((requestEvent) => {
  const email = requestEvent.query.get("email") ?? "";
  return { email };
});

export default component$(() => {
  const successData = useSuccessData();

  return (
    <div class="wizard-page">
      <div class="wizard-card">
        <div class="success-icon">🎉</div>
        <h1 style="text-align:center;">Registration complete!</h1>
        {successData.value.email ? (
          <p style="text-align:center;">
            Your account for <strong>{successData.value.email}</strong> has
            been created successfully.
          </p>
        ) : (
          <p style="text-align:center;">Your account has been created successfully.</p>
        )}
        <p style="text-align:center; margin-top: 2rem;">
          <a class="link-muted" href="/">
            &larr; Back to home
          </a>
        </p>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Registration Complete | Qwik Wizard",
  meta: [
    {
      name: "description",
      content: "Your registration has been completed successfully.",
    },
  ],
};
