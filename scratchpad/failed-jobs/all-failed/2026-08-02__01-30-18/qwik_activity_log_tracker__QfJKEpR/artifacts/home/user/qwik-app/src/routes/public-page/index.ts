import type { RequestHandler } from '@builder.io/qwik-city';

export const onGet: RequestHandler = async ({ html }) => {
  html(
    200,
    `<!DOCTYPE html>
<html>
  <head>
    <title>Public Page</title>
  </head>
  <body>
    <h1>Public Page</h1>
  </body>
</html>`
  );
};
