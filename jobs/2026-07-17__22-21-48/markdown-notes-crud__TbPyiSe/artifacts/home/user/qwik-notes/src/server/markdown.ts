/**
 * Server-only Markdown -> sanitized HTML conversion.
 *
 * Uses the unified ecosystem (remark/rehype) with `rehype-sanitize` so that
 * unsafe HTML (e.g. <script> tags) is stripped before the content is ever
 * rendered. This module must only be imported from server boundaries.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

// Allow `class` attributes so the rendered output can be styled, while keeping
// everything else at the safe defaults (no scripts, no event handlers, etc.).
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className", "class"],
  },
};

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown);
  return String(file);
}