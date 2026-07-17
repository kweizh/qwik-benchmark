import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const useWikiPage = routeLoader$(async (requestEvent) => {
  const slug = requestEvent.params.slug;
  const filePath = path.join('/home/user/qwik-app/wiki-pages', `${slug}.md`);
  try {
    const markdown = await fs.promises.readFile(filePath, 'utf-8');
    const html = await marked.parse(markdown);
    return { html, error: null };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      requestEvent.status(404);
      return { html: null, error: 'Not Found' };
    }
    requestEvent.status(500);
    return { html: null, error: 'Server Error' };
  }
});

export default component$(() => {
  const page = useWikiPage();
  if (page.value.error === 'Not Found') {
    return (
      <div class="wiki-content">
        <h1>404 - Wiki Page Not Found</h1>
      </div>
    );
  }
  if (page.value.error) {
    return (
      <div class="wiki-content">
        <h1>Error: {page.value.error}</h1>
      </div>
    );
  }
  return (
    <div class="wiki-content" dangerouslySetInnerHTML={page.value.html || ''} />
  );
});
