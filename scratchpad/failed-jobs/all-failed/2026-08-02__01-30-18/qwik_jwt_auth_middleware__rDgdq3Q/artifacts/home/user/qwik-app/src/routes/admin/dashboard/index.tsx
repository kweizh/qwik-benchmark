import { component$ } from "@builder.io/qwik";
import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ status }) => {
  status(200);
};

export default component$(() => {
  return (
    <div>
      Welcome to the Admin Dashboard, admin!
    </div>
  );
});
