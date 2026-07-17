import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (ev) => {
  ev.html(200, "<h1>Admin Dashboard</h1>");
};
