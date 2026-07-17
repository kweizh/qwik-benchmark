import { component$ } from '@builder.io/qwik';
import {
  Link,
  routeLoader$,
  useLocation,
  type DocumentHead,
} from '@builder.io/qwik-city';
import {
  listArticlesFiltered,
  listFacets,
  type ArticleListItem,
  type FacetRow,
} from '~/lib/db';

interface ArticlesViewData {
  articles: ArticleListItem[];
  facets: FacetRow[];
  selectedTags: string[];
}

export const useArticlesLoader = routeLoader$<ArticlesViewData>(
  async (requestEvent) => {
    const url = requestEvent.url;
    const selectedTags = url.searchParams.getAll('tag');

    const articles = listArticlesFiltered(selectedTags);
    const facets = listFacets(selectedTags);

    return {
      articles,
      facets,
      selectedTags,
    };
  }
);

export default component$(() => {
  const data = useArticlesLoader();
  const loc = useLocation();

  const selectedTags = data.value.selectedTags;
  const selectedSet = new Set(selectedTags);

  /**
   * Build a query string that toggles `tagName` in the current selection.
   */
  const toggleHref = (tagName: string): string => {
    const params = new URLSearchParams();
    const next = selectedSet.has(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    for (const t of next) {
      params.append('tag', t);
    }
    const qs = params.toString();
    return qs ? `/articles?${qs}` : '/articles';
  };

  const clearHref = '/articles';

  return (
    <div>
      <h1>Articles</h1>

      <section class="facets" aria-label="Tag filters">
        {data.value.facets.map((facet) => {
          const isActive = selectedSet.has(facet.name);
          return (
            <Link
              key={facet.name}
              href={toggleHref(facet.name)}
              class={`facet${isActive ? ' active' : ''}`}
              data-facet={facet.name}
              data-count={facet.count}
            >
              <span>{facet.name}</span>
              <span class="facet-count">{facet.count}</span>
            </Link>
          );
        })}
      </section>

      {selectedTags.length > 0 && (
        <div class="active-filters" data-active-tags={selectedTags.join(',')}>
          <span>Active filters: </span>
          {selectedTags.map((tag) => (
            <span key={tag} class="active-tag" data-active-tag={tag}>
              {tag}
            </span>
          ))}
          <Link href={clearHref}>Clear all</Link>
        </div>
      )}

      {data.value.articles.length === 0 ? (
        <div class="empty-state">
          No articles match the selected filters.{' '}
          <Link href={clearHref}>Clear filters</Link>
        </div>
      ) : (
        <div class="articles">
          {data.value.articles.map((article) => (
            <article
              key={article.slug}
              class="article-card"
              data-article={article.slug}
            >
              <h2>
                <Link href={`/articles/${article.slug}`}>{article.title}</Link>
              </h2>
              <div class="article-tags">
                Tags: {article.tags.join(', ')}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Current URL for debugging — useful for SSR verification */}
      <p style="font-size:0.75rem;color:#999;margin-top:2rem">
        Current URL: {loc.url.pathname}
        {loc.url.search}
      </p>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Articles',
};