/**
 * Server-only Markdown → sanitized HTML rendering.
 *
 * `marked` parses Markdown into HTML; `sanitize-html` then strips anything
 * dangerous (e.g. `<script>` tags, inline event handlers, `javascript:`
 * URLs, etc.) so the result is safe to feed into Qwik's
 * `dangerouslySetInnerHTML`.
 *
 * Both libraries are server-only and never imported from a client
 * component.
 */
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "blockquote",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "code",
    "pre",
    "hr",
    "br",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "del",
    "input", // for GFM task lists
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title"],
    code: ["class"],
    pre: ["class"],
    input: ["type", "checked", "disabled"],
    th: ["align"],
    td: ["align"],
  },
  // Force every link to be safe.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
  // Disallow any tag that *is* on the allow-list from carrying inline
  // event handlers or other JS-execution attributes.
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // Drop any disallowed tag entirely (with its contents) instead of
  // escaping it, so e.g. `<script>alert(1)</script>` never reaches the
  // browser at all.
  disallowedTagsMode: "discard",
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown ?? "", { async: false }) as string;
  return sanitizeHtml(rawHtml, sanitizeOptions);
}