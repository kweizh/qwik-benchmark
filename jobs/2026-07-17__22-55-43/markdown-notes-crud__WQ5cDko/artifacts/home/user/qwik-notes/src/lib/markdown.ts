import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

// Server-only helper: converts Markdown source into sanitized HTML that is
// safe to render via dangerouslySetInnerHTML on the client.

const md = new MarkdownIt({
  html: false, // never trust raw HTML embedded in the markdown source
  linkify: true,
  breaks: true,
});

export function renderMarkdownToSafeHtml(markdown: string): string {
  const rawHtml = md.render(markdown ?? "");

  return sanitizeHtml(rawHtml, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "a",
      "ul",
      "ol",
      "li",
      "blockquote",
      "code",
      "pre",
      "strong",
      "em",
      "hr",
      "br",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "img",
      "del",
      "s",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
  });
}
