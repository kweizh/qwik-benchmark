import type { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async (event) => {
  event.html(
    200,
    "<!DOCTYPE html><html><head><title>Admin Dashboard</title></head><body><h1>Admin Dashboard</h1></body></html>",
  );
};
