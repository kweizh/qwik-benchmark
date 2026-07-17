import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import fs from "fs";
import path from "path";
import { marked } from "marked";

export const useWikiPage = routeLoader$(async (requestEvent) => {
  const slug = requestEvent.params.slug;
  const wikiPagesDir = "/home/user/qwik-app/wiki-pages";
  const filePath = path.join(wikiPagesDir, `${slug}.md`);

  // Simple path traversal check to ensure the path is within the wikiPagesDir
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(wikiPagesDir))) {
    throw requestEvent.error(400, "Invalid slug");
  }

  try {
    const content = await fs.promises.readFile(resolvedPath, "utf-8");
    const html = await marked.parse(content);
    return { html };
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw requestEvent.error(404, "Not Found");
    }
    throw requestEvent.error(500, "Internal Server Error");
  }
});

export default component$(() => {
  const page = useWikiPage();

  return (
    <div class="wiki-content" dangerouslySetInnerHTML={page.value.html} />
  );
});
