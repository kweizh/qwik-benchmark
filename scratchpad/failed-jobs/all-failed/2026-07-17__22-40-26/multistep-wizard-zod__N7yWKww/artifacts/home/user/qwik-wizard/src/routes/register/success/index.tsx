import { component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  type DocumentHead,
} from "@builder.io/qwik-city";

export const useSuccessData = routeLoader$((ev) => {
  const email = ev.cookie.get("registered_email")?.value;
  if (!email) {
    throw ev.redirect(303, "/register/");
  }
  // Clear the one-shot cookie so refreshing the page doesn't loop.
  ev.cookie.delete("registered_email", { path: "/" });
  return { email };
});

export default component$(() => {
  const data = useSuccessData();

  return (
    <main>
      <h1>Welcome aboard! 🎉</h1>
      <p>
        Your account has been created. We registered the following email:
      </p>
      <p>
        <strong>{data.value.email}</strong>
      </p>
      <p>
        <Link href="/register/">Register another account →</Link>
      </p>
    </main>
  );
});

export const head: DocumentHead = {
  title: "Registered",
};