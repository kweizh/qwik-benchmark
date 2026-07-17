/**
 * Preview/Node entry. Starts an HTTP server on PORT (default 3000) bound to
 * 0.0.0.0, serving the Qwik City SSR app.
 */
import { createQwikCity, type PlatformNode } from '@builder.io/qwik-city/middleware/node';
import qwikCityPlan from '@qwik-city-plan';
import { manifest } from '@qwik-client-manifest';
import { createServer } from 'node:http';
import render from './entry.ssr';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface QwikCityPlatform extends PlatformNode {}
}

const { router, notFound, staticFile } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const server = createServer((req, res) => {
  staticFile(req, res, () => {
    router(req, res, () => {
      notFound(req, res, () => {});
    });
  });
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Qwik server listening on http://${HOST}:${PORT}`);
});