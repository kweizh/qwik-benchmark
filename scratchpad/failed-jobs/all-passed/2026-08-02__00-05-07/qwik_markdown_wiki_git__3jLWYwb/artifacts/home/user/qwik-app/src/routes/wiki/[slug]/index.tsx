import type { RequestHandler } from "@builder.io/qwik-city";
import { micromark } from "micromark";
import { readWikiPage, wikiPageExists } from "~/lib/wiki-fs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div class="wiki-content">${bodyHtml}</div>
  </body>
</html>`;
}

export const onGet: RequestHandler = async (requestEvent) => {
  const { slug } = requestEvent.params;

  if (!slug || !wikiPageExists(slug)) {
    requestEvent.html(
      404,
      renderPage(
        "Page not found",
        `<p>The wiki page "${escapeHtml(slug ?? "")}" does not exist.</p>`,
      ),
    );
    return;
  }

  const markdown = readWikiPage(slug);
  const contentHtml = micromark(markdown);

  requestEvent.html(200, renderPage(slug, contentHtml));
};
