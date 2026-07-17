import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const useWikiContent = routeLoader$(async (event) => {
  const slug = event.params.slug;
  const filePath = path.join('/home/user/qwik-app/wiki-pages', `${slug}.md`);

  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const html = await marked(content);
    return { html };
  } catch {
    event.status(404);
    return null;
  }
});

export default component$(() => {
  const data = useWikiContent();

  if (!data.value) {
    return (
      <div class="wiki-content">
        <h1>404 - Page Not Found</h1>
        <p>The requested wiki page does not exist.</p>
      </div>
    );
  }

  return (
    <div class="wiki-content" dangerouslySetInnerHTML={data.value.html} />
  );
});
