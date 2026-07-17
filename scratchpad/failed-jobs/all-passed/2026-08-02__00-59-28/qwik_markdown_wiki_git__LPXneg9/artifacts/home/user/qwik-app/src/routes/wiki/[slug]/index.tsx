import { component$ } from "@builder.io/qwik";
import {
  routeLoader$,
  useLocation,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { readFileSync, existsSync } from "node:fs";
import { marked } from "marked";

export const useWikiPage = routeLoader$(({ params, status }) => {
  const slug = params.slug;
  const filePath = `/home/user/qwik-app/wiki-pages/${slug}.md`;

  if (!existsSync(filePath)) {
    status(404);
    return null;
  }

  const raw = readFileSync(filePath, "utf-8");
  const html = marked.parse(raw) as string;

  return { html, slug };
});

export default component$(() => {
  const loc = useLocation();
  const page = useWikiPage();

  if (!page.value) {
    return (
      <div>
        <h1>404 - Page Not Found</h1>
        <p>The wiki page "{loc.params.slug}" does not exist.</p>
      </div>
    );
  }

  return (
    <div class="wiki-content" dangerouslySetInnerHTML={page.value.html} />
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const page = resolveValue(useWikiPage);
  return {
    title: page?.slug ? `Wiki - ${page.slug}` : "Wiki - Not Found",
  };
};
