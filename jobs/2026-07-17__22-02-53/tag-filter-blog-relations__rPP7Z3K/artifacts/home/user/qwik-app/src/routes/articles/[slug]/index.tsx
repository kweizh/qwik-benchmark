import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getArticleBySlug } from '../../../lib/db';

export const useArticleLoader = routeLoader$((requestEvent) => {
  const article = getArticleBySlug(requestEvent.params.slug);
  if (!article) {
    throw requestEvent.error(404, 'Article not found');
  }
  return article;
});

export default component$(() => {
  const article = useArticleLoader();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <a href="/articles" style={{ color: '#007acc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Articles
      </a>
      
      <h1>{article.value.title}</h1>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Tags:</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {article.value.tags.map(tag => (
            <span
              key={tag}
              data-tag={tag}
              style={{
                padding: '6px 12px',
                backgroundColor: '#eaeaea',
                borderRadius: '20px',
                fontSize: '14px'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
