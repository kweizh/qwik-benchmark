import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getFilteredArticlesAndFacets } from '../../lib/db';

export const useArticlesLoader = routeLoader$((requestEvent) => {
  const url = requestEvent.url;
  const selectedTags = url.searchParams.getAll('tag');
  const { articles, facets } = getFilteredArticlesAndFacets(selectedTags);
  return {
    articles,
    facets,
    selectedTags
  };
});

export default component$(() => {
  const data = useArticlesLoader();

  const toggleTagUrl = (tag: string, selectedTags: string[]) => {
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    const params = new URLSearchParams();
    nextTags.forEach(t => params.append('tag', t));
    const queryString = params.toString();
    return `/articles${queryString ? '?' + queryString : ''}`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Articles</h1>

      <div style={{ display: 'flex', gap: '40px' }}>
        {/* Sidebar with facets */}
        <div style={{ width: '200px' }}>
          <h2>Filter by Tag</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.value.facets.map(facet => {
              const isActive = data.value.selectedTags.includes(facet.name);
              return (
                <div
                  key={facet.name}
                  data-facet={facet.name}
                  data-count={facet.count}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: isActive ? '#e0f7fa' : '#fff'
                  }}
                >
                  <a
                    href={toggleTagUrl(facet.name, data.value.selectedTags)}
                    style={{ textDecoration: 'none', color: '#333', fontWeight: isActive ? 'bold' : 'normal' }}
                  >
                    {isActive ? '✓ ' : ''}{facet.name} ({facet.count})
                  </a>
                </div>
              );
            })}
          </div>

          {data.value.selectedTags.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>Active Filters</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.value.selectedTags.map(tag => (
                  <div
                    key={tag}
                    data-active-tag={tag}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#007acc',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{tag}</span>
                    <a
                      href={toggleTagUrl(tag, data.value.selectedTags)}
                      style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}
                    >
                      ×
                    </a>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px' }}>
                <a href="/articles" style={{ fontSize: '14px', color: '#007acc' }}>Clear all</a>
              </div>
            </div>
          )}
        </div>

        {/* Article listing */}
        <div style={{ flex: 1 }}>
          <h2>Matching Articles</h2>
          {data.value.articles.length === 0 ? (
            <p>No articles found matching all selected tags.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.value.articles.map(article => (
                <div
                  key={article.slug}
                  data-article={article.slug}
                  style={{
                    padding: '16px',
                    border: '1px solid #eaeaea',
                    borderRadius: '8px'
                  }}
                >
                  <h3 style={{ margin: '0 0 8px 0' }}>
                    <a href={`/articles/${article.slug}`} style={{ color: '#007acc', textDecoration: 'none' }}>
                      {article.title}
                    </a>
                  </h3>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
