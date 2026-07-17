import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export const useWikiContent = routeLoader$(async ({ params, error }) => {
  const slug = params.slug;
  const filePath = path.join('/home/user/qwik-app/wiki-pages', `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    throw error(404, 'Not Found');
  }

  try {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const html = await marked.parse(fileContent);
    return {
      html,
    };
  } catch {
    throw error(404, 'Not Found');
  }
});

export default component$(() => {
  const content = useWikiContent();

  return (
    <div class="wiki-content" dangerouslySetInnerHTML={content.value.html} />
  );
});
